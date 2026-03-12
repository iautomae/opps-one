
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await request.json();
        const { agentId, config } = body;

        if (!agentId || !config) {
            return NextResponse.json({ error: 'Missing agentId or config data' }, { status: 400 });
        }

        console.log(`Updating config for agent ${agentId}...`);

        const { data: updatedAgent, error: updateError } = await supabase
            .from('agentes')
            .update({
                pushover_user_1_name: config.pushover_user_1_name || null,
                pushover_user_1_key: config.pushover_user_1_key || null,
                pushover_user_1_token: config.pushover_user_1_token || null,
                pushover_user_2_name: config.pushover_user_2_name || null,
                pushover_user_2_key: config.pushover_user_2_key || null,
                pushover_user_2_token: config.pushover_user_2_token || null,
                pushover_user_3_name: config.pushover_user_3_name || null,
                pushover_user_3_key: config.pushover_user_3_key || null,
                pushover_user_3_token: config.pushover_user_3_token || null,
                pushover_user_1_active: config.pushover_user_1_active ?? true,
                pushover_user_2_active: config.pushover_user_2_active ?? true,
                pushover_user_3_active: config.pushover_user_3_active ?? true,
                pushover_user_1_template: config.pushover_user_1_template || null,
                pushover_user_2_template: config.pushover_user_2_template || null,
                pushover_user_3_template: config.pushover_user_3_template || null,
                pushover_user_1_title: config.pushover_user_1_title || null,
                pushover_user_2_title: config.pushover_user_2_title || null,
                pushover_user_3_title: config.pushover_user_3_title || null,
                pushover_user_1_notification_filter: config.pushover_user_1_notification_filter || null,
                pushover_user_2_notification_filter: config.pushover_user_2_notification_filter || null,
                pushover_user_3_notification_filter: config.pushover_user_3_notification_filter || null,
                pushover_user_1_test_phone: config.pushover_user_1_test_phone || null,
                pushover_user_2_test_phone: config.pushover_user_2_test_phone || null,
                pushover_user_3_test_phone: config.pushover_user_3_test_phone || null,
                pushover_user_1_profile_id: config.pushover_user_1_profile_id || null,
                pushover_user_2_profile_id: config.pushover_user_2_profile_id || null,
                pushover_user_3_profile_id: config.pushover_user_3_profile_id || null,
                pushover_template: config.pushover_template || null,
                pushover_notification_filter: config.pushover_notification_filter || 'ALL',
                pushover_title: config.pushover_title || null,
                pushover_reply_message: config.pushover_reply_message || null,
                make_webhook_url: config.make_webhook_url || null
            })
            .eq('id', agentId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, agent: updatedAgent });

    } catch (error: unknown) {
        console.error('Error updating agent config:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
