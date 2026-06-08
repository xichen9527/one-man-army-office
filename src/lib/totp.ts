/**
 * TOTP (Time-based One-Time Password) 工具函数
 * 用于两步验证功能
 */

import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

/**
 * 生成 TOTP 密钥
 */
export function generateTOTPSecret(): string {
  // 生成 Base32 编码的密钥（20字节）
  const secret = new OTPAuth.Secret()
  return secret.base32
}

/**
 * 生成 otpauth:// URL（用于二维码）
 */
export function generateOTPAuthURL(email: string, secret: string, issuer: string = 'OnePersonArmy'): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  })
  return totp.toString()
}

/**
 * 生成二维码 Data URL
 */
export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })
}

/**
 * 验证 TOTP 代码
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    })
    // 允许时间窗口偏移 ±1（每个窗口30秒，即允许前后30秒）
    const delta = totp.validate({
      token,
      window: 1
    })
    return delta !== null
  } catch {
    return false
  }
}

/**
 * 格式化密钥为可读形式（每4个字符一组，空格分隔）
 */
export function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}
