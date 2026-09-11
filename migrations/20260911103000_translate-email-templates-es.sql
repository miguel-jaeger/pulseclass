-- ============================================================
-- TRANSLATE EMAIL TEMPLATES TO SPANISH
-- ============================================================

UPDATE email.templates SET
  subject = 'Verifica tu correo electrónico',
  body_html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;"><div style="text-align:center;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Verifica tu correo electrónico</h2><p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Ingresa este código para verificar tu correo electrónico</p><div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:16px 32px;display:inline-block;margin-bottom:24px;"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">{{ token }}</span></div><p style="margin:0;color:#9ca3af;font-size:12px;">Este código expira en 15 minutos</p></div></body></html>',
  updated_at = now()
WHERE template_type = 'email-verification-code';

UPDATE email.templates SET
  subject = 'Verifica tu correo electrónico',
  body_html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;"><div style="text-align:center;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Verifica tu correo electrónico</h2><p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Haz clic en el botón para verificar tu correo electrónico</p><a href="{{ link }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:500;">Verificar correo</a><p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">Este enlace expira en 24 horas</p></div></body></html>',
  updated_at = now()
WHERE template_type = 'email-verification-link';

UPDATE email.templates SET
  subject = '{{ token }} es tu código de verificación',
  body_html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;"><div style="text-align:center;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Tu código de verificación</h2><p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Ingresa este código para continuar</p><div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:16px 32px;display:inline-block;margin-bottom:24px;"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">{{ token }}</span></div><p style="margin:0;color:#9ca3af;font-size:12px;">Este código expira en 15 minutos</p></div></body></html>',
  updated_at = now()
WHERE template_type = 'request-otp';

UPDATE email.templates SET
  subject = 'Restablecer tu contraseña',
  body_html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;"><div style="text-align:center;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Restablecer tu contraseña</h2><p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Ingresa este código para restablecer tu contraseña</p><div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:16px 32px;display:inline-block;margin-bottom:24px;"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">{{ token }}</span></div><p style="margin:0;color:#9ca3af;font-size:12px;">Este código expira en 15 minutos</p></div></body></html>',
  updated_at = now()
WHERE template_type = 'reset-password-code';

UPDATE email.templates SET
  subject = 'Restablecer tu contraseña',
  body_html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;"><div style="text-align:center;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Restablecer tu contraseña</h2><p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Haz clic en el botón para restablecer tu contraseña</p><a href="{{ link }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:500;">Restablecer contraseña</a><p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">Este enlace expira en 24 horas</p></div></body></html>',
  updated_at = now()
WHERE template_type = 'reset-password-link';