import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const createTransport = () => {
  if (!env.smtp.host) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
  });
};

export const sendEmail = async ({ to, subject, html }) => {
  const transport = createTransport();
  if (!transport) {
    logger.info('Email skipped; SMTP not configured', { to, subject });
    return { deliveryMode: 'log' };
  }
  await transport.sendMail({ from: env.smtp.user, to, subject, html });
  return { deliveryMode: 'smtp' };
};
