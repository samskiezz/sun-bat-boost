import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertTriangle, XCircle, Download, FileText, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ComplianceRule {
  id: string;
  rule_code: string;
  standard_reference: string;
  rule_description: string;
  validation_logic: any;
  severity: 'info' | 'warning' | 'error';
  auto_fixable: boolean;
  created_at: string;
  updated_at: string;
}

interface ComplianceCheck {
  id: string;
  site_id: string;
  system_design: any;
  check_results: any;
  overall_status: 'compliant' | 'non_compliant' | 'warning';
  evidence_package: any;
  checked_at: string;
  created_at: string;
}

const DEMO_RULES: Partial<ComplianceRule>[] = [
  {
    rule_code: 'AS3000_2.1.1',
    standard_reference: 'AS/NZS 3000:2018',
    rule_description: 'DC conductor voltage drop must not exceed 3%',
    severity: 'error',
    auto_fixable: true
  },
  {
    rule_code: 'AS4777_5.2.1',
    standard_reference: 'AS/NZS 4777.1:2016',
    rule_description: 'Inverter must have grid protection settings compliant with local DNSP',
    severity: 'error',
    auto_fixable: false
  },
  {
    rule_code: 'AS5139_4.3.2',
    standard_reference: 'AS/NZS 5139:2019',
    rule_description: 'Battery system must include approved safety disconnects',
    severity: 'error',
    auto_fixable: false
  },
  {
    rule_code: 'CEC_PANEL_001',
    standard_reference: 'CEC Approved Products',
    rule_description: 'All panels must be CEC approved and within validity period',
    severity: 'error',
    auto_fixable: false
  },
  {
    rule_code: 'DNSP_EXPORT_001',
    standard_reference: 'DNSP Guidelines',
    rule_description: 'Export capacity must not exceed DNSP limits for postcode',
    severity: 'warning',
    auto_fixable: true
  }
];

export function ComplianceTab() {
  const { toast } = useToast();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadRules();
    loadChecks();
  }, []);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('compliance_rules')
      .select('*')
      .order('rule_code');
    
    if (error) {
      console.error('Error loading compliance rules:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance rules",
        variant: "destructive",
      });
      return;
    }
    
    // Cast DB data to match interface types
    const mappedRules: ComplianceRule[] = (data || []).map(rule => ({
      ...rule,
      severity: rule.severity as 'info' | 'warning' | 'error',
      validation_logic: rule.validation_logic as any
    }));
    setRules(mappedRules);
  };

  const loadChecks = async () => {
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .order('checked_at', { ascending: false });
    
    if (error) {
      console.error('Error loading compliance checks:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance checks",
        variant: "destructive",
      });
      return;
    }
    
    // Cast DB data to match interface types
    const mappedChecks: ComplianceCheck[] = (data || []).map(check => ({
      ...check,
      overall_status: check.overall_status as 'compliant' | 'non_compliant' | 'warning',
      system_design: check.system_design as any,
      check_results: check.check_results as any,
      evidence_package: check.evidence_package as any
    }));
    setChecks(mappedChecks);
    if (mappedChecks.length > 0) {
      setSelectedCheck(mappedChecks[0]);
    }
  };

  const initializeDemoRules = async () => {
    // First delete existing rules to avoid duplicates
    await supabase.from('compliance_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const rulesToInsert = DEMO_RULES.map(rule => ({
      rule_code: rule.rule_code!,
      standard_reference: rule.standard_reference!,
      rule_description: rule.rule_description!,
      validation_logic: {
        type: 'calculation',
        formula: 'example_validation',
        parameters: {}
      },
      severity: rule.severity!,
      auto_fixable: rule.auto_fixable!
    }));

    const { error } = await supabase
      .from('compliance_rules')
      .insert(rulesToInsert);

    if (error) {
      console.error('Error initializing demo rules:', error);
      toast({
        title: "Error",
        description: "Failed to initialize demo rules",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Demo compliance rules initialized",
    });
    loadRules();
  };

  const runComplianceCheck = async () => {
    if (rules.length === 0) {
      toast({
        title: "Error",
        description: "No compliance rules found. Initialize demo rules first.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);

    // Simulate system design
    const systemDesign = {
      panels: {
        count: 20,
        model: 'SunPower SPR-X21-335',
        power_rating: 335,
        voltage_dc: 54.7
      },
      inverter: {
        model: 'SMA STP 6000TL-20',
        power_rating: 6000,
        grid_protection: 'AS4777.2 compliant'
      },
      battery: {
        model: 'Tesla Powerwall 2',
        capacity_kwh: 13.5,
        safety_systems: ['disconnect', 'monitoring', 'thermal']
      },
      location: {
        postcode: 2000,
        dnsp: 'Ausgrid',
        export_limit: 5.0
      }
    };

    // Simulate compliance checking
    const checkResults: any = {};
    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (const rule of rules) {
      const randomOutcome = Math.random();
      let status: 'pass' | 'fail' | 'warning';
      let message: string;
      let evidence: string[] = [];

      if (rule.severity === 'error' && randomOutcome < 0.2) {
        status = 'fail';
        failCount++;
        message = `Non-compliance detected: ${rule.rule_description}`;
        evidence = ['Design calculation sheet', 'DNSP requirements document'];
      } else if (rule.severity === 'warning' && randomOutcome < 0.3) {
        status = 'warning';
        warningCount++;
        message = `Potential issue: ${rule.rule_description}`;
        evidence = ['Site assessment notes'];
      } else {
        status = 'pass';
        passCount++;
        message = `Compliant: ${rule.rule_description}`;
        evidence = ['Compliance certificate', 'Test results'];
      }

      checkResults[rule.rule_code] = {
        status,
        message,
        evidence,
        auto_fix_applied: status === 'fail' && rule.auto_fixable ? Math.random() < 0.5 : false
      };
    }

    const overallStatus = failCount > 0 ? 'non_compliant' : 
                         warningCount > 0 ? 'warning' : 'compliant';

    const evidencePackage = {
      certificates: ['CEC approval certificate', 'DNSP connection approval'],
      calculations: [
        { type: 'voltage_drop', result: '2.1%', status: 'pass' },
        { type: 'short_circuit', result: 'Within limits', status: 'pass' },
        { type: 'earth_fault', result: 'Protected', status: 'pass' }
      ],
      diagrams: ['Single line diagram', 'Site layout', 'Protection coordination']
    };

    const { data, error } = await supabase
      .from('compliance_checks')
      .insert([{
        site_id: `site_${Date.now()}`,
        system_design: systemDesign,
        check_results: checkResults,
        overall_status: overallStatus,
        evidence_package: evidencePackage
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving compliance check:', error);
      toast({
        title: "Error",
        description: "Failed to save compliance check",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Compliance check completed: ${passCount} pass, ${warningCount} warnings, ${failCount} failures`,
      });
      loadChecks();
    }

    setIsChecking(false);
  };

  const exportEvidencePackage = () => {
    if (!selectedCheck) return;

    const evidenceData = {
      check_id: selectedCheck.id,
      site_id: selectedCheck.site_id,
      checked_at: selectedCheck.checked_at,
      overall_status: selectedCheck.overall_status,
      results: selectedCheck.check_results,
      evidence: selectedCheck.evidence_package
    };

    const blob = new Blob([JSON.stringify(evidenceData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_evidence_${selectedCheck.site_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Evidence package exported",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail':
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const calculateComplianceScore = (checkResults: any) => {
    if (!checkResults || typeof checkResults !== 'object') return 0;
    const results = Object.values(checkResults);
    if (results.length === 0) return 0;
    const passCount = results.filter((r: any) => r.status === 'pass').length;
    return (passCount / results.length) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Guardrails</h2>
          <p className="text-muted-foreground">
            Automated AS/NZS 3000, 4777.1, 5139 compliance checking
          </p>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && (
            <Button variant="outline" onClick={initializeDemoRules}>
              <FileText className="mr-2 h-4 w-4" />
              Initialize Rules
            </Button>
          )}
          <Button onClick={runComplianceCheck} disabled={isChecking}>
            <Search className="mr-2 h-4 w-4" />
            {isChecking ? 'Checking...' : 'Run Compliance Check'}
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      {selectedCheck && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedCheck.overall_status)}
                <div>
                  <div className="text-2xl font-bold">
                    {selectedCheck.overall_status === 'compliant' ? 'Compliant' :
                     selectedCheck.overall_status === 'warning' ? 'Warning' : 'Non-Compliant'}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {calculateComplianceScore(selectedCheck.check_results).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
              <Progress 
                value={calculateComplianceScore(selectedCheck.check_results)} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {selectedCheck.check_results ? 
                  Object.values(selectedCheck.check_results).filter((r: any) => r.status === 'pass').length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Rules Passed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {selectedCheck.check_results ? 
                  Object.values(selectedCheck.check_results).filter((r: any) => r.auto_fix_applied).length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Auto-Fixed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Check Results</CardTitle>
          <CardDescription>
            Detailed rule-by-rule compliance assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedCheck ? (
            <Tabs defaultValue="results" className="w-full">
              <TabsList>
                <TabsTrigger value="results">Check Results</TabsTrigger>
                <TabsTrigger value="evidence">Evidence Package</TabsTrigger>
                <TabsTrigger value="system">System Design</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  {selectedCheck.check_results && Object.entries(selectedCheck.check_results).map(([ruleCode, result]: [string, any]) => {
                    const rule = rules.find(r => r.rule_code === ruleCode);
                    return (
                      <AccordionItem key={ruleCode} value={ruleCode}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(result.status)}
                              <div className="text-left">
                                <div className="font-medium">{ruleCode}</div>
                                <div className="text-sm text-muted-foreground">
                                  {rule?.standard_reference}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.auto_fix_applied && (
                                <Badge variant="secondary">Auto-Fixed</Badge>
                              )}
                              <Badge 
                                variant={result.status === 'pass' ? 'default' : 
                                        result.status === 'warning' ? 'secondary' : 'destructive'}
                              >
                                {result.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-3">
                            <div>
                              <div className="font-medium">Rule Description:</div>
                              <div className="text-sm text-muted-foreground">
                                {rule?.rule_description}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Check Result:</div>
                              <div className="text-sm">{result.message}</div>
                            </div>
                            {result.evidence && result.evidence.length > 0 && (
                              <div>
                                <div className="font-medium">Supporting Evidence:</div>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {result.evidence.map((evidence: string, i: number) => (
                                    <li key={i}>{evidence}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </TabsContent>
              
              <TabsContent value="evidence" className="mt-4">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Evidence Package</h4>
                    <Button onClick={exportEvidencePackage} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export Package
                    </Button>
                  </div>
                  
                  {selectedCheck.evidence_package && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {selectedCheck.evidence_package.certificates && (
                        <div>
                          <h5 className="font-medium mb-2">Certificates</h5>
                          <ul className="space-y-1 text-sm">
                            {selectedCheck.evidence_package.certificates.map((cert: string, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {cert}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {selectedCheck.evidence_package.calculations && (
                        <div>
                          <h5 className="font-medium mb-2">Calculations</h5>
                          <div className="space-y-2">
                            {selectedCheck.evidence_package.calculations.map((calc: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span>{calc.type.replace('_', ' ')}</span>
                                <Badge variant={calc.status === 'pass' ? 'default' : 'destructive'}>
                                  {calc.result}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedCheck.evidence_package.diagrams && (
                        <div>
                          <h5 className="font-medium mb-2">Diagrams</h5>
                          <ul className="space-y-1 text-sm">
                            {selectedCheck.evidence_package.diagrams.map((diagram: string, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {diagram}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="system" className="mt-4">
                {selectedCheck.system_design && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-3">Solar System</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Panel Count:</span>
                          <span>{selectedCheck.system_design.panels?.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Panel Model:</span>
                          <span>{selectedCheck.system_design.panels?.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>System Size:</span>
                          <span>{selectedCheck.system_design.panels ? 
                            (selectedCheck.system_design.panels.count * selectedCheck.system_design.panels.power_rating / 1000).toFixed(1) : 0} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inverter:</span>
                          <span>{selectedCheck.system_design.inverter?.model}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-3">Location & Network</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Postcode:</span>
                          <span>{selectedCheck.system_design.location?.postcode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DNSP:</span>
                          <span>{selectedCheck.system_design.location?.dnsp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Export Limit:</span>
                          <span>{selectedCheck.system_design.location?.export_limit} kW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {checks.length === 0 ? 'Run a compliance check to see results' : 'Select a check from the history below'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check History */}
      {checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Check History</CardTitle>
            <CardDescription>Previous compliance assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCheck?.id === check.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedCheck(check)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.overall_status)}
                      <div>
                        <div className="font-medium">{check.site_id}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(check.checked_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {calculateComplianceScore(check.check_results).toFixed(0)}% compliant
                      </div>
                      <Badge 
                        variant={check.overall_status === 'compliant' ? 'default' : 
                                check.overall_status === 'warning' ? 'secondary' : 'destructive'}
                      >
                        {check.overall_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
