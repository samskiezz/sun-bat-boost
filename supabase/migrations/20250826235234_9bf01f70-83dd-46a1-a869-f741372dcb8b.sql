-- Training automation schedules table
CREATE TABLE automation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL DEFAULT '{}',
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_run TIMESTAMP WITH TIME ZONE,
    last_run_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation execution logs
CREATE TABLE automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES automation_schedules(id),
    trigger_reason TEXT NOT NULL,
    session_id UUID,
    status TEXT NOT NULL DEFAULT 'triggered',
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
CREATE POLICY "Allow all operations on automation_schedules" 
ON automation_schedules 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on automation_logs" 
ON automation_logs 
FOR ALL 
USING (true);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_automation_schedules_updated_at
    BEFORE UPDATE ON automation_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_automation_schedules_next_run ON automation_schedules(next_run);
CREATE INDEX idx_automation_schedules_status ON automation_schedules(status);
CREATE INDEX idx_automation_logs_schedule_id ON automation_logs(schedule_id);
CREATE INDEX idx_automation_logs_created_at ON automation_logs(created_at);