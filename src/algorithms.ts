import { SSHAlgorithmType } from 'tabby-ssh'

export const defaultAlgorithms: Record<SSHAlgorithmType, string[]> = {
  [SSHAlgorithmType.KEX]: [
    'mlkem768x25519-sha256',
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group14-sha256',
  ],
  [SSHAlgorithmType.HOSTKEY]: [
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-256',
    'rsa-sha2-512',
    'ssh-rsa',
  ],
  [SSHAlgorithmType.CIPHER]: [
    'chacha20-poly1305@openssh.com',
    'aes256-gcm@openssh.com',
    'aes256-ctr',
    'aes192-ctr',
    'aes128-ctr',
  ],
  [SSHAlgorithmType.HMAC]: [
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512',
    'hmac-sha2-256',
    'hmac-sha1-etm@openssh.com',
    'hmac-sha1',
  ],
  [SSHAlgorithmType.COMPRESSION]: [
    'none',
  ],
}