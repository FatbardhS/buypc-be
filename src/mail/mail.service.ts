import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMailOptions, Transporter, createTransport } from 'nodemailer';

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

  /** Sends and logs the result, so the server logs show every email that went out */
  private async send(message: SendMailOptions): Promise<void> {
    const info = await this.transport!.sendMail(message);
    this.logger.log(`Sent "${message.subject}" to ${[message.to].flat().join(", ")}: ${info.response}`);
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
    await this.send({
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

  /** "New sign-up" notice for the admins */
  async sendNewUserNotice(
    to: string[],
    user: { name: string; email: string; createdAt: Date; total: number },
  ): Promise<void> {
    const when = user.createdAt.toLocaleString('en-GB', { timeZone: 'Europe/Belgrade', dateStyle: 'medium', timeStyle: 'short' });
    const adminLink = `${this.appUrl}/admin`;
    if (!this.transport) {
      this.logger.warn(`Email not configured. New sign-up: ${user.name} <${user.email}> (notice for ${to.join(', ')})`);
      return;
    }
    // The name and email are typed by the visitor, so they're escaped before going into the email
    const name = escapeHtml(user.name);
    const email = escapeHtml(user.email);
    await this.send({
      from: this.from,
      to,
      subject: `New BYPC sign-up: ${user.name.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
      text: `Someone just created a BYPC account.\n\nName: ${user.name}\nEmail: ${user.email}\nWhen: ${when}\nAccounts in total: ${user.total}\n\nSee all users: ${adminLink}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
  <h2 style="margin:0 0 12px">New sign-up</h2>
  <p>Someone just created a BYPC account.</p>
  <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:4px 16px 4px 0;color:#555">Name</td><td style="padding:4px 0"><b>${name}</b></td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#555">Email</td><td style="padding:4px 0">${email}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#555">When</td><td style="padding:4px 0">${when}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#555">Accounts in total</td><td style="padding:4px 0">${user.total}</td></tr>
  </table>
  <p style="margin:24px 0"><a href="${adminLink}" style="background:#22d3ee;color:#061014;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open the admin panel</a></p>
  <p style="font-size:12px;color:#777">You get this because your email is in ADMIN_EMAILS.</p>
</div>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
