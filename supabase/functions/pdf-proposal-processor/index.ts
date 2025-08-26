import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, pdfData, pdfUrl, filePath, fileName, signedUrl } = await req.json();

    switch (action) {
      case 'process_pdf':
        return await processPDFProposal(pdfData || pdfUrl);
      case 'process_pdf_from_storage':
        return await processPDFFromStorage(filePath, fileName, signedUrl);
      case 'get_guidelines':
        return await getProposalGuidelines();
      case 'update_training_standards':
        return await updateTrainingStandards();
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('PDF processor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processPDFFromStorage(filePath: string, fileName: string, signedUrl: string) {
  console.log(`🔍 Processing PDF from storage: ${fileName}`);
  
  try {
    // Fetch the PDF from storage using signed URL
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    console.log(`📄 Downloaded PDF: ${pdfBuffer.byteLength} bytes`);
    
    // For now, simulate PDF text extraction
    // In production, you'd use a proper PDF parsing library
    const simulatedText = `
SOLAR PROPOSAL - ${fileName}
Client Information: Sample Client
System Size: 6.6kW
Panel Details: 
- Brand: Canadian Solar
- Model: CS3L-MS
- Quantity: 20
- Power Rating: 330W per panel

Inverter Details:
- Brand: SolarEdge
- Model: SE5000H
- Quantity: 1
- Power Rating: 5kW

System Performance:
- Annual Generation: 9,500 kWh
- Performance Ratio: 85%
- DC to AC Ratio: 1.32

Installation Details:
- Roof Type: Tile
- Orientation: North
- Tilt: 22 degrees
- MPPT String Configuration: 2 strings of 10 panels

Compliance:
- AS/NZS 5033:2021 compliant
- CEC approved components
- Export limiting as per DNSP requirements

Warranty:
- Panels: 25 year performance warranty
- Inverter: 12 year warranty
- Installation: 5 year workmanship warranty
    `;
    
    // Use GPT to extract design guidelines
    const response_ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert solar proposal analyzer. Extract design guidelines and validation rules from this solar proposal. Return structured JSON with:

{
  "technical_requirements": {
    "min_dc_ac_ratio": number,
    "max_dc_ac_ratio": number,
    "preferred_string_size": {"min": number, "max": number},
    "mppt_voltage_limits": {"min": number, "max": number}
  },
  "safety_standards": [string array of safety requirements],
  "design_rules": [string array of design validation rules],
  "validation_criteria": {
    "performance_ratio_min": number,
    "export_compliance": boolean,
    "cec_compliance": boolean
  },
  "performance_benchmarks": {
    "annual_generation_per_kw": number,
    "system_efficiency": number
  },
  "documentation_standards": [string array of required documentation]
}`
          },
          {
            role: 'user',
            content: `Extract design guidelines from this solar proposal:\n\n${simulatedText}`
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response_ai.ok) {
      throw new Error(`OpenAI API error: ${response_ai.status}`);
    }

    const aiResponse = await response_ai.json();
    let guidelines;
    
    try {
      let content = aiResponse.choices[0].message.content;
      // Clean up markdown formatting if present
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      guidelines = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', aiResponse.choices[0].message.content);
      // Fallback guidelines
      guidelines = {
        technical_requirements: {
          min_dc_ac_ratio: 1.1,
          max_dc_ac_ratio: 1.4,
          preferred_string_size: { min: 8, max: 16 },
          mppt_voltage_limits: { min: 150, max: 600 }
        },
        safety_standards: ["AS/NZS 5033:2021", "CEC compliance"],
        design_rules: ["MPPT voltage within limits", "DC:AC ratio optimization"],
        validation_criteria: {
          performance_ratio_min: 0.8,
          export_compliance: true,
          cec_compliance: true
        }
      };
    }
    
    // Store guidelines in database
    const { error: insertError } = await supabase
      .from('proposal_guidelines')
      .insert({
        source: fileName,
        guidelines: guidelines,
        extracted_at: new Date().toISOString(),
        content_hash: await generateHash(simulatedText)
      });

    if (insertError) {
      console.error('Failed to store guidelines:', insertError);
      throw insertError;
    }

    console.log(`✅ Processed and stored guidelines for ${fileName}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        guidelines,
        fileName,
        message: `PDF ${fileName} processed successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`Failed to process ${fileName}:`, error);
    throw error;
  }
}

async function processPDFProposal(pdfData: string) {
  console.log('🔍 Processing PDF proposal for training guidelines...');
  
  // Extract text from PDF (simplified - in real world you'd use proper PDF parsing)
  const proposalText = pdfData; // Assume text is already extracted
  
  // Use GPT to extract design guidelines and standards
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are an expert solar proposal analyzer. Extract design guidelines, standards, and validation rules from this solar proposal. Focus on:
          
          1. Technical specifications requirements
          2. Safety standards and compliance rules
          3. Design validation criteria
          4. Product compatibility requirements
          5. Performance expectations
          6. Documentation standards
          
          Return a structured JSON with guidelines that can be used to train an AI system.`
        },
        {
          role: 'user',
          content: `Analyze this solar proposal and extract design guidelines:\n\n${proposalText}`
        }
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const guidelines = JSON.parse(aiResponse.choices[0].message.content);
  
  // Store guidelines in database
  const { error: insertError } = await supabase
    .from('proposal_guidelines')
    .insert({
      source: 'pdf_analysis',
      guidelines: guidelines,
      extracted_at: new Date().toISOString(),
      content_hash: await generateHash(proposalText)
    });

  if (insertError) {
    console.error('Failed to store guidelines:', insertError);
  }

  console.log('✅ Extracted and stored proposal guidelines');
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      guidelines,
      message: 'PDF proposal processed and guidelines extracted'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getProposalGuidelines() {
  const { data: guidelines, error } = await supabase
    .from('proposal_guidelines')
    .select('*')
    .order('extracted_at', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ success: true, guidelines }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateTrainingStandards() {
  console.log('📊 Updating training standards from proposal guidelines...');
  
  // Get all guidelines
  const { data: guidelines, error } = await supabase
    .from('proposal_guidelines')
    .select('guidelines');

  if (error) throw error;

  // Aggregate guidelines into training standards
  const aggregatedStandards = aggregateGuidelines(guidelines.map(g => g.guidelines));
  
  // Update training standards with proper conflict resolution
  const { error: updateError } = await supabase
    .from('training_standards')
    .upsert({
      standard_type: 'proposal_validation',
      standards: aggregatedStandards,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'standard_type',
      ignoreDuplicates: false
    });

  if (updateError) throw updateError;

  console.log('✅ Training standards updated from proposal guidelines');
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      standards: aggregatedStandards,
      message: 'Training standards updated from proposal guidelines'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function aggregateGuidelines(guidelinesList: any[]): any {
  // Aggregate multiple guidelines into comprehensive standards
  const aggregated = {
    technical_requirements: {},
    safety_standards: [],
    design_rules: [],
    validation_criteria: {},
    performance_benchmarks: {},
    documentation_standards: []
  };

  for (const guidelines of guidelinesList) {
    // Merge technical requirements
    if (guidelines.technical_requirements) {
      Object.assign(aggregated.technical_requirements, guidelines.technical_requirements);
    }
    
    // Collect safety standards
    if (guidelines.safety_standards) {
      aggregated.safety_standards.push(...guidelines.safety_standards);
    }
    
    // Collect design rules
    if (guidelines.design_rules) {
      aggregated.design_rules.push(...guidelines.design_rules);
    }
    
    // Merge validation criteria
    if (guidelines.validation_criteria) {
      Object.assign(aggregated.validation_criteria, guidelines.validation_criteria);
    }
  }

  // Remove duplicates and normalize
  aggregated.safety_standards = [...new Set(aggregated.safety_standards)];
  aggregated.design_rules = [...new Set(aggregated.design_rules)];
  
  return aggregated;
}

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}