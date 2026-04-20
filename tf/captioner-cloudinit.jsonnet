local cloudConfig = {
  users: [
    {
      name: 'rk',
      primary_group: 'rk',
      uid: 3333,
      groups: 'adm,sudo,plugdev,netdev,lxd',
      ssh_authorized_keys: ['# dummy comment'],
      sudo: [
        'ALL=(ALL) NOPASSWD: ALL',
      ],
      shell: '/bin/bash',
    },
  ],
  bootcmd: [
    //    [
    //      'cloud-init-per',
    //      'once',
    //      'ssh-port',
    //      'bash',
    //      '-c',
    //      'echo Port 9922 >> /etc/ssh/sshd_config',
    //    ],
    ['sudo', 'mkdir', '-p', '/usr/local/share/keyrings'],
    ['sudo', 'curl', '-SsfL', '-o', '/usr/local/share/keyrings/sorah-rbpkg.gpg', 'https://github.com/sorah-rbpkg/dockerfiles/raw/master/files/sorah-rbpkg.gpg'],  // FIXME: validate fingerprint
    [
      'sudo',
      'bash',
      '-c',
      'echo "deb [signed-by=/usr/local/share/keyrings/sorah-rbpkg.gpg] http://cache.ruby-lang.org/lab/sorah/deb/ noble main" > /etc/apt/sources.list.d/sorah-ruby.list',
    ],
    [
      'sudo',
      'bash',
      '-c',
      ' echo "Package: src:ruby-defaults\nPin: version 1:4.0+0nkmi1~noble\nPin-Priority: 999" > /etc/apt/preferences.d/91-sorah-rbpkg-ruby-defaults',
    ],
    ['sudo', 'curl', '-fSsL', '-o', '/usr/local/share/keyrings/mise-archive-keyring.asc', 'https://mise.jdx.dev/gpg-key.pub'],
    [
      'sudo',
      'bash',
      '-c',
      'echo "deb [signed-by=/usr/local/share/keyrings/mise-archive-keyring.asc] https://mise.jdx.dev/deb stable main" > /etc/apt/sources.list.d/mise.list',
    ],
  ],
  packages: [
    'amazon-ecr-credential-helper',
    'docker.io',
    'ffmpeg',
    'tmux',
    'acl',
    'git',
    'build-essential',
    'libyaml-dev',
    'ruby4.0-dev',
    'ruby4.0',
    'ruby',
    'aws-cli',
    'mise',
  ],
  write_files: [
    {
      content: '{"credsStore": "ecs-login"}',
      owner: 'rk:rk',
      path: '/root/dockerconfig.json',
      permissions: '0644',
    },
  ],
  runcmd: [
    ['curl', '-o', '/home/rk/.ssh/authorized_keys.rknet', 'https://rubykaigi.net/authorized_keys'],  // rubykaigi-net//tf/bastion/ssh_keys.tf
    ['bash', '-c', 'cat /home/rk/.ssh/authorized_keys.rknet | tee -a /home/rk/.ssh/authorized_keys'],
    ['rm', '/home/rk/.ssh/authorized_keys.rknet'],
    ['ls', '-la', '/home/rk/.ssh'],
    [
      'install',
      '-D',
      '-m0644',
      '-ork',
      '-grk',
      '/root/dockerconfig.json',
      '/home/rk/.docker/config.json',
    ],
    [
      'sudo',
      'gpasswd',
      '-a',
      'rk',
      'docker',
    ],
    [
      'sudo',
      '-u',
      'rk',
      'bash',
      '-c',
      'if [[ ! -e ~rk/signage-app ]]; then git clone https://github.com/ruby-no-kai/signage-app ~rk/signage-app && cd ~rk/signage-app && ( ./caption/ec2init || touch ~rk/ready-fail && false ) && touch ~rk/ready; fi',
    ],
  ],
};

//output
{
  userData: std.format('#cloud-config\n%s\n', [std.manifestYamlDoc(cloudConfig, true)]),
}
