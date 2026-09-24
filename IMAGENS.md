# Fotos na cotação

- Área da foto na tela: 104 × 104 px; impressão: 82 × 82 px.
- Fundo de exibição branco, imagem centralizada e inteira (`object-fit: contain`). Fotos enviadas manualmente são convertidas para JPEG sobre fundo branco; a busca não remove fundos coloridos automaticamente.
- Importação: primeira aba de `.xlsx`, `.xls` ou `.csv`, até 300 linhas. Cabeçalhos aceitos: Descrição/Produto/Item/Nome; Quantidade/Qtd/Qtde; Preço Unitário/Valor Unitário/Preço/Valor; opcionais Marca/Modelo/Código/SKU/EAN/GTIN. O sistema adiciona linhas à cotação existente. Revise antes de salvar.
- Busca: cada linha oferece “Buscar foto”. O usuário confere produto e direitos de uso, escolhe a opção; o serviço salva a imagem selecionada no bucket `quote-images` do Supabase. Requer `BRAVE_SEARCH_API_KEY` configurada como variável de ambiente no Netlify para Functions.
- Sem a chave, envio manual e importação da lista seguem disponíveis. A busca informa que a configuração está pendente.
