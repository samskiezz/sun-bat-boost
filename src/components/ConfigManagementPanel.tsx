import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCode, Save, Upload, Download, Settings, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConfigFile {
  id: string;
  config_name: string;
  config_type: string;
  config_data: any;
  updated_at: string;
}

const ConfigManagementPanel: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ConfigFile | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const defaultConfigs = {
    training_config: {
      seed: 42,
      stages: [
        {
          name: 'pretrain_core',
          epochs: 3,
          tasks: ['masked_layout_lm', 'masked_image_modeling'],
          batch_size: 16,
          lr: 2e-4
        },
        {
          name: 'supervised_multitask',
          epochs: 8,
          tasks: ['ocr_ctc', 'layout_detect', 'json_extraction', 'rule_predict'],
          weights: { ocr_ctc: 1.0, layout_detect: 0.6, json_extraction: 1.2, rule_predict: 0.8, consistency: 0.4, rl: 0.0 },
          batch_size: 8,
          lr: 1e-4,
          early_stop: { metric: 'json_f1', patience: 3 }
        },
        {
          name: 'rl_finetune',
          episodes: 50000,
          env: 'DesignEnv',
          reward_weights: {
            ocr_brand_model_match: 10,
            ocr_qty_match: 6,
            dc_ac_within_target: 12,
            mppt_window_satisfied: 15,
            string_lengths_valid: 8,
            battery_compat_true: 10,
            dnsp_export_respected: 10,
            structure_valid: 10,
            penalty_wrong_phase: -20,
            penalty_voltage_violation: -15,
            penalty_missing_block: -25,
            penalty_hallucinated_product: -30
          },
          mix: { real: 0.6, synthetic: 0.4 }
        },
        {
          name: 'distill_and_quantize',
          distill: {
            teacher_ckpt: 'best.ckpt',
            students: ['student_cv', 'student_nlp', 'student_planner']
          },
          quantization: { scheme: 'int8_per_channel', calibration_samples: 500 }
        }
      ],
      metrics: {
        gates: {
          brand_model_f1: '>=0.92',
          json_validity: '>=0.98',
          rule_pass_rate: '>=0.90'
        }
      },
      logging: {
        eval_interval_steps: 500,
        checkpoint_top_k: 3
      }
    },

    model_config: {
      backbone: {
        type: 'multimodal_encoder',
        dim: 768,
        layers: 16
      },
      heads: {
        ocr: {
          type: 'ctc',
          vocab: 'ascii_plus_symbols'
        },
        layout: {
          type: 'detector',
          classes: ['table', 'keyvalue', 'header', 'stringing_block', 'pricing', 'rebates', 'equipment']
        },
        nlp_extractor: {
          type: 'seq2seq',
          schema: 'proposal_v1.json'
        },
        planner: {
          type: 'classifier_regressor',
          outputs: ['mppt_ok', 'export_ok', 'dc_ac', 'string_ok', 'battery_compat']
        },
        policy: {
          type: 'actor_critic',
          action_space: {
            choose_panel: 'topK(50)',
            choose_inverter: 'topK(50)',
            choose_battery: 'topK(50)',
            set_strings: 'discrete(2..16)',
            set_export_strategy: ['capped5kW', 'three_phase_balance', 'dnsp_rule']
          }
        }
      }
    },

    routing_config: {
      thresholds: {
        ocr_confidence: 0.90,
        json_schema_valid: true,
        rule_pass_pred: 0.80
      },
      fallback: {
        use_cloud_if: ['ocr_confidence_below', 'schema_invalid', 'pdf_scanned_no_text']
      },
      on_device: {
        engines: ['NNAPI', 'GPU'],
        models: {
          ocr: 'student_cv_int8.tflite',
          extractor: 'student_nlp_int8.tflite',
          planner: 'student_planner_int8.tflite'
        }
      }
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('model_configs')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConfigs(data || []);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  const saveConfig = async (configType: string, configData: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('model_configs')
        .upsert({
          config_name: configType,
          config_type: configType,
          config_data: configData
        });

      if (error) throw error;

      toast({
        title: 'Configuration Saved',
        description: `${configType} configuration updated successfully`
      });

      loadConfigs();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigSave = () => {
    if (!selectedConfig) return;

    try {
      const parsedConfig = JSON.parse(editedContent);
      saveConfig(selectedConfig.config_type, parsedConfig);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Please check your configuration syntax',
        variant: 'destructive'
      });
    }
  };

  const selectConfig = (config: ConfigFile) => {
    setSelectedConfig(config);
    setEditedContent(JSON.stringify(config.config_data, null, 2));
  };

  const createDefaultConfig = (configType: string) => {
    const defaultData = defaultConfigs[configType as keyof typeof defaultConfigs];
    if (defaultData) {
      saveConfig(configType, defaultData);
    }
  };

  const downloadConfig = (config: ConfigFile) => {
    const dataStr = JSON.stringify(config.config_data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.config_name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuration Management</h2>
          <p className="text-muted-foreground">
            Manage training, model, and deployment configurations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => createDefaultConfig('training_config')}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Create Training Config
          </Button>
          
          <Button
            onClick={() => createDefaultConfig('model_config')}
            variant="outline"
            size="sm"
          >
            <FileCode className="w-4 h-4 mr-2" />
            Create Model Config
          </Button>
          
          <Button
            onClick={() => createDefaultConfig('routing_config')}
            variant="outline"
            size="sm"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Create Routing Config
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Configurations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configs.length > 0 ? (
                configs.map(config => (
                  <div
                    key={config.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedConfig?.id === config.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => selectConfig(config)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{config.config_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(config.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {config.config_type}
                        </Badge>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadConfig(config);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No configurations found</p>
                  <p className="text-xs">Create default configs to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Editor */}
        <div className="lg:col-span-2">
          {selectedConfig ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    {selectedConfig.config_name}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Badge>{selectedConfig.config_type}</Badge>
                    
                    <Button
                      onClick={handleConfigSave}
                      disabled={isLoading}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Alert>
                  <Settings className="w-4 h-4" />
                  <AlertDescription>
                    Edit the JSON configuration below. Changes will be applied to the next training run.
                  </AlertDescription>
                </Alert>
                
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Configuration JSON..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a configuration to edit</p>
                  <p className="text-sm">Or create a new one using the buttons above</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Configuration Templates Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Training Config</h4>
              <p className="text-sm text-muted-foreground">
                Defines the 4-stage training pipeline: pretrain → supervised → RL → distill.
                Includes batch sizes, learning rates, and reward weights.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Model Config</h4>
              <p className="text-sm text-muted-foreground">
                Specifies the multimodal backbone and 5 specialist heads.
                Controls architecture dimensions and head-specific parameters.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Routing Config</h4>
              <p className="text-sm text-muted-foreground">
                NPU deployment settings with confidence thresholds.
                Configures on-device vs cloud fallback routing logic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigManagementPanel;