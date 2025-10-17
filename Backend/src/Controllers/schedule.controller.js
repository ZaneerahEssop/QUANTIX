const supabase = require("../Config/supabase");

const getSchedule = async (req, res) => {
  try {
    const { event_id } = req.params;
    if (!event_id) return res.status(400).json({ error: "event_id is required" });

    const { data, error } = await supabase
      .from('event_schedule_items')
      .select('id, title, description, start_time, end_time, position')
      .eq('event_id', event_id)
      .order('position', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const schedule = (data || []).map((row) => ({
      id: row.id,
      activity: row.title || '',
      description: row.description || '',
      time: row.start_time
        ? (typeof row.start_time === 'string' ? row.start_time.substring(11, 16) : '')
        : '',
      start_time: row.start_time,
      end_time: row.end_time,
      position: row.position,
    }));

    res.status(200).json({ schedule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

const replaceSchedule = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { schedule } = req.body;
    if (!event_id) return res.status(400).json({ error: "event_id is required" });
    if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule must be an array' });

    const { error: delErr } = await supabase
      .from('event_schedule_items')
      .delete()
      .eq('event_id', event_id);
    if (delErr) return res.status(500).json({ error: delErr.message });

    const rows = schedule.map((item, idx) => ({
      event_id,
      title: (item.activity ?? item.title ?? item.name ?? 'Untitled'),
      description: item.description ?? null,
      start_time: item.start_time ?? null,
      end_time: item.end_time ?? null,
      position: typeof item.position === 'number' ? item.position : idx,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('event_schedule_items')
        .insert(rows);
      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

module.exports = { getSchedule, replaceSchedule };


