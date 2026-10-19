import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';

/**
 * Sends email through Gmail (GMAIL_USER + GMAIL_APP_PASSWORD, a Google "app password").
 * When those aren't set, emails are only logged, so local development works without a mailbox.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;
  /** Where links in emails point (the website) */
  readonly appUrl: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('GMAIL_USER');
    const pass = config.get<string>('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    this.transport = user && pass ? createTransport({ service: 'gmail', auth: { user, pass } }) : null;
    this.from = `BYPC <${user ?? 'no-reply@localhost'}>`;
    this.appUrl = (config.get<string>('APP_URL') ?? 'http://localhost:4200').replace(/\/$/, '');
  }

  /** True when real emails go out */
  get enabled(): boolean {
    return !!this.transport;
  }

  async sendVerification(to: string, name: string, token: string): Promise<void> {
    const link = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    if (!this.transport) {
      this.logger.warn(`Email not configured. Confirmation link for ${to}: ${link}`);
      return;
    }
    const safeName = name.replace(/[<>&"]/g, '');
    await this.transport.sendMail({
      from: this.from,
      to,
      subject: 'Confirm your email for BYPC',
      text: `Hi ${safeName},\n\nConfirm your email to finish setting up your BYPC account:\n${link}\n\nThe link works for 24 hours. If you didn't sign up, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
  <h2 style="margin:0 0 12px">Confirm your email</h2>
  <p>Hi ${safeName}, click the button to finish setting up your BYPC account.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#22d3ee;color:#061014;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Confirm email</a></p>
  <p style="font-size:13px;color:#555">Or open this link: <br><a href="${link}">${link}</a></p>
  <p style="font-size:13px;color:#555">The link works for 24 hours. If you didn't sign up, ignore this email.</p>
</div>`,
    });
  }
}
