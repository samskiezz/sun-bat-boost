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
    const { action, pdfData, pdfUrl } = await req.json();

    switch (action) {
      case 'process_pdf':
        return await processPDFProposal(pdfData || pdfUrl);
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
  
  // Update training standards
  const { error: updateError } = await supabase
    .from('training_standards')
    .upsert({
      standard_type: 'proposal_validation',
      standards: aggregatedStandards,
      updated_at: new Date().toISOString()
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