# Minhas finanças

Responde uma pergunta: **quanto sobra no fim do mês depois de pagar todas as faturas e contas?**

Feito para quem gasta no crédito num mês e paga no seguinte. Funciona no celular e no computador, sem servidor: os dados ficam no navegador (localStorage).

## Como usar

1. **Quanto você tem hoje**: toque em "Tenho agora" na tela do mês.
2. **O que entra**: salário e outras entradas (podem repetir todo mês).
3. **Cartões**: cadastre com o dia de fechamento e de vencimento.
4. **Botão +**: lance cada compra. Digite o valor, escolha o cartão e as parcelas; o app põe cada parcela na fatura certa.

A tela do mês mostra a conta inteira:

```
  Tenho agora (ou: sobra do mês anterior)
+ Entradas
+ Me devem
− Faturas
− Contas
= Sobra
```

A faixa de meses no topo mostra quanto sobra no fim de cada mês, já contando as parcelas futuras.

Quando você paga ou recebe algo, marque o círculo. O app entende que esse dinheiro já saiu (ou entrou) do "Tenho agora" e não conta de novo.

## Levar os dados para o celular

Na aba **Dados**:

- **Enviar link**: gera um link com todos os dados. Abra no outro aparelho e confirme.
- **Mostrar QR code**: lido pelo app no outro aparelho (Dados → Escanear QR code). Se os dados forem grandes, o QR é dividido em partes que vão passando na tela.
- **Copiar código**: um texto para colar no outro aparelho (Dados → Colar código).
- **Arquivo de backup**: um `.json` para guardar ou mandar. Também abre backups da versão antiga.

Ao receber, você escolhe entre **juntar** (fica o mais recente de cada lado) ou **substituir tudo**.

> O link e a câmera precisam que o app esteja publicado num endereço `https` (GitHub Pages, Netlify, Vercel…).
> Abrindo por `localhost`, o link só funciona no próprio computador. Use o código ou o arquivo.

## Desenvolvimento

```sh
npm install
npm run dev           # http://localhost:5173
npm run dev:celular   # expõe na rede local para abrir no celular (mesmo Wi-Fi)
npm run build         # gera dist/, pode ser servido de qualquer pasta
```

Vue 3 + Pinia + Vite. Os dados da versão antiga (`finvue_v10`) são migrados automaticamente na primeira abertura, e a chave antiga continua guardada como cópia de segurança.
