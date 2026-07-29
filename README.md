# GeoRisk - Frontend

[![React](https://img.shields.io/badge/react-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-5.4-purple.svg)](https://vitejs.dev/)
[![Leaflet](https://img.shields.io/badge/leaflet-1.9-green.svg)](https://leafletjs.com/)

O Frontend da plataforma **GeoRisk** — uma rede social focada no mapeamento e compartilhamento em tempo real de eventos climáticos extremos. Construída como Projeto Final do curso de Full Stack Python da EBAC.

---

## Sobre o Projeto

A interface do GeoRisk foi projetada para ser ágil e imersiva. Através de um tema predominantemente Dark (Modern UI), o sistema apresenta duas faces principais:
1. **O Feed da Rede Social:** Interaja com outros usuários, comente, curta e siga as pessoas de seu interesse.
2. **O Mapa (GeoRisk):** Um ambiente geoespacial baseado no `react-leaflet`, onde você pode apontar sua localização no mapa (através do GPS do navegador ou manualmente) e cadastrar eventos como tempestades e inundações. Cada alerta é marcado visualmente no mapa e espelhado automaticamente no seu Feed.

---

## Funcionalidades Principais

- **Feed Global e Privado:** Alternância dinâmica entre ver todos os posts da rede ou apenas das pessoas que você segue.
- **Formulário de Postagem Inteligente:** O campo de novo post vem com um *template base* pré-carregado em background para incentivar o reporte estruturado.
- **Meu Perfil:** Interface de atualização de bio e upload visual de foto de perfil (clique na imagem).
- **Gerenciamento de Senha:** Tela dedicada isolada para troca segura de senha.
- **GeoRisk Map:** 
  - Renderização fluída utilizando `react-leaflet`.
  - Captura de Geolocalização nativa do navegador.
  - Sincronização entre o envio do alerta no mapa e a geração de um post automático no Feed.

---

## Stack Tecnológica

- **Core:** React 18 + Vite
- **Navegação:** React Router DOM v6
- **Requisições HTTP:** Axios
- **Mapas e Geospacial:** React-Leaflet (`leaflet`)
- **Estilização:** CSS3 Moderno (Variáveis de ambiente, Dark Mode estrito, Glassmorphism)

---

## Como Rodar o Frontend Localmente

### 1. Instalar as Dependências
Abra o terminal na pasta raiz do projeto (`social_frontend`) e execute:
```bash
npm install
```

### 2. Configurar a API
Se o backend estiver rodando em outra URL/porta, você pode criar um arquivo `.env` na raiz do frontend e configurar a variável `VITE_API_URL`.
Por padrão, o axios tentará se comunicar com `http://127.0.0.1:8000/api`.

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra `http://localhost:5173` no seu navegador.

---

## Licença
Projeto distribuído sob a licença MIT.
