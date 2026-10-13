# Site do Grêmio Estudantil

## Configurar o Firebase

1. A configuração do app Web enviada já está em `firebase-config.js`.
2. Ative **Authentication > E-mail/senha** e crie a conta principal do grêmio em **Users** usando `CLX@gmail.com`.
3. Ative o **Cloud Firestore**.
4. Publique as regras atualizadas de `firestore.rules` no Firebase.
5. Hospede os arquivos em um servidor que ofereça HTTPS. Para desenvolvimento, use um servidor local, como a extensão Live Server do VS Code.

As regras deixam a leitura do conteúdo pública, permitem que a conta principal (`clx@gmail.com`, comparada sem diferenciar maiúsculas/minúsculas pelo Firebase) gerencie convites e restringem convites à coleção `siteEditors`. A coleção de conteúdo `siteContent` pode ser editada pela conta principal e por e-mails autorizados. Não publique o Firestore sem essas regras.

## Conteúdo do site

O painel administrativo permite publicar links de formulários, materiais, e-mails e novidades do grêmio. O conteúdo é salvo na coleção `siteContent` do Firestore e aparece para visitantes sem login.

Somente a conta `CLX@gmail.com` vê a seção **Acessos da equipe**. Nela, o administrador autoriza um e-mail ou revoga o acesso. A pessoa autorizada abre **Área do grêmio > Tem convite? Criar acesso**, informa esse mesmo e-mail e cria a própria senha. Não enviamos e-mail automaticamente; o administrador precisa compartilhar o endereço do site com a pessoa. Contas autorizadas podem editar o conteúdo, mas não podem adicionar ou remover outros acessos.

Se o administrador esquecer a senha, abra **Área do grêmio**, informe o e-mail da conta e escolha **Esqueci minha senha**. O Firebase enviará um link de redefinição se o e-mail estiver cadastrado; confira também a pasta de spam.

Se o Firebase estiver indisponível, o site informa o problema de conexão. Antes de publicar, configure o acesso de administrador e publique as regras corretas do Firestore.
