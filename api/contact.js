const TO = ['admin@vividex.au', 'info@vividex.au'];
const FROM = process.env.RESEND_FROM_EMAIL || 'Vividex Contact Form <onboarding@resend.dev>';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { name, email, project, message, botcheck } = req.body || {};

  // Honeypot: pretend success so bots don't learn they were filtered.
  if (botcheck) {
    res.writeHead(303, { Location: '/success.html' });
    res.end();
    return;
  }

  if (!name || !email || !message) {
    res.status(400).send('Missing required fields.');
    return;
  }

  const key = process.env.RESEND_API_KEY;
  console.log('DEBUG resend key check:', {
    present: !!key,
    length: key ? key.length : 0,
    hasWhitespace: !!key && key !== key.trim(),
    prefix: key ? key.slice(0, 3) : null,
    suffix: key ? key.slice(-4) : null,
  });
  console.log('DEBUG from field:', JSON.stringify(FROM), 'raw env:', JSON.stringify(process.env.RESEND_FROM_EMAIL));

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        reply_to: email,
        subject: `New enquiry — Vividex${project ? ` (${project})` : ''}`,
        text: `Name: ${name}\nEmail: ${email}\nProject: ${project || 'Not specified'}\n\nMessage:\n${message}`,
      }),
    });

    if (!resendRes.ok) {
      console.error('Resend API error:', resendRes.status, await resendRes.text());
      res.status(502).send('Failed to send your message. Please email us directly at admin@vividex.au.');
      return;
    }

    res.writeHead(303, { Location: '/success.html' });
    res.end();
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).send('Server error. Please email us directly at admin@vividex.au.');
  }
}
