# OulDesign — versão atualizada

Esta pasta contém a nova versão do site com:

- logo 3D incluída e controlada pelo cursor em 360°;
- cards editoriais do FAQ com imagens, palavras-chave e leitura corrigida;
- primeiro card do FAQ com mais tempo de permanência;
- versões atualizadas dos vídeos de Chamelette, Nonno e Samuka;
- uma seção editorial completa para cada projeto;
- galeria de projetos abaixo de “Sobre nós” no lugar das logos decorativas;
- revelação suave da marca na apresentação da empresa;
- transição gradual para o amarelo e encerramento com “Identidade”;
- rodapé corrigido para mostrar “OULDESIGN” inteiro;
- fallback visual para a abertura caso o modelo 3D não carregue.

## Arquivos incluídos

O pacote já inclui os novos vídeos e pôsteres em `assets/portfolio/`, as imagens
do FAQ em `assets/faq/`, as versões da marca e o modelo 3D em:

```text
assets/ouldesign-logo-3d.glb
```

Esse arquivo é a cópia integrada do modelo enviado como
`ouldesign-logo-3d-otimizada(5).glb`. O nome foi simplificado dentro do projeto
apenas para manter um caminho estável no código.

A pasta `vendor/` usada pelo Three.js já está incluída e não precisa ser
substituída. Ela contém o conjunto completo da versão 0.172.0, inclusive o
arquivo obrigatório `three.core.min.js`. O pacote preserva a licença da
biblioteca em `vendor/LICENSE-three.txt`.

## Teste local

Abra esta pasta pelo Live Server do VS Code. Não abra `index.html` diretamente
com `file://`, porque módulos JavaScript e o modelo 3D precisam de um servidor local.

## Formulário

O formulário continua em modo de preparação. Substitua `SEU_CODIGO` no atributo
`action` do formulário em `index.html` pelo código real do Formspree quando ele
estiver disponível.
