# Site do Grêmio Estudantil

## Configurar o Firebase

1. O app Web já está configurado em `firebase-config.js` para o projeto `site-principal-da-vanguarda`.
2. No Firebase Authentication, ative o provedor **E-mail/senha** e crie a conta administradora `CLX@gmail.com`.
3. Ative o Cloud Firestore.
4. No Firebase Console, abra **Firestore Database > Regras**, cole o conteúdo atualizado de `firestore.rules` e clique em **Publicar**. Não é preciso habilitar Cloud Functions nem ativar um plano pago para esse fluxo.

5. Hospede os arquivos do site em um servidor HTTPS. Para desenvolvimento, use a extensão Live Server do VS Code.

O fluxo usa Authentication e Cloud Firestore, sem Cloud Functions. A leitura do conteúdo é pública, mas só o administrador e as contas autorizadas podem editar `siteContent`. Apenas a conta `CLX@gmail.com` pode ler ou modificar a coleção `siteEditors`. As regras do Firestore impedem que editores convidados autorizem outras contas.

## Contas da equipe

Entre na área do grêmio com `CLX@gmail.com`. Em **Acessos da equipe**, autorize o e-mail da pessoa. Ela deve abrir **Área do grêmio > Tenho autorização, criar conta**, usar o mesmo e-mail e criar a própria senha. O cadastro no Firebase Authentication fica aberto para permitir que novos usuários criem as próprias contas; sem autorização correspondente em `siteEditors`, ninguém recebe acesso de edição. A proteção real dos dados é aplicada pelas regras do Firestore.

As contas da equipe podem editar conteúdo, mas não criar ou revogar outras autorizações. Use **Revogar acesso** para remover a autorização no site. Uma conta revogada continua existindo em Authentication, mas deixa de ter permissão para administrar o site.

Se qualquer pessoa esquecer a senha, abra **Área do grêmio**, informe o e-mail da conta e escolha **Esqueci minha senha**. O Firebase enviará um link para redefinir a senha; confira também a pasta de spam.

## Conteúdo

O painel administrativo permite publicar links de formulários, materiais e novidades do grêmio. Para publicar a lista de e-mails dos professores, selecione **PDF com e-mails dos professores** e cole o link compartilhável do arquivo PDF. Se estiver no Google Drive, ajuste o compartilhamento para que qualquer pessoa com o link possa visualizar. O conteúdo é salvo na coleção `siteContent` do Firestore e aparece para visitantes sem login.
