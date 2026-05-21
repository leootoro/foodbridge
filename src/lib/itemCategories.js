
// 1. O Dicionário de Categorias (A "inteligência" da busca)
export const categoryMapping = {
  frutas: ["maçã", "banana", "laranja", "uva", "mamão", "melancia", "melão", "abacaxi", "limão", "morango"],
  hortifruti: ["alface", "tomate", "batata", "cebola", "alho", "cenoura", "vagem", "pepino", "repolho", "abobrinha", "pimentão"],
  congelados: ["hambúrguer congelado", "nuggets", "batata frita congelada", "pizza congelada", "lasanha congelada", "sorvete", "pão de queijo congelado"]
};

// 2. A lista expandida para o Select do Doador
export const expandedMarketItems = [
  "frutas",
  "hortifruti",
  "congelados",
  
  "açúcar", "achocolatado", "água mineral", "água sanitária", "água tônica", "aguardente",
  "álcool em gel", "algodão", "amaciante", "arroz", "aveia", "azeite de oliva", 
  "biscoito", "bisnaguinha", "bolacha", "bolo", "café", "carnes", 
  "cereal matinal", "cerveja", "chá", "condicionador", "creme de leite", "creme dental",
  "desinfetante", "desodorante", "detergente", "escova de dentes", "espuma de barbear",
  "farinha de mandioca", "farinha de milho", "farinha de trigo", "feijão", "fermento",
  "fio dental", "geleia", "hastes flexíveis", "iogurte", "ketchup", "lâmina de barbear",
  "leite", "leite condensado", "limpador multiuso", "macarrão", "maionese", "manteiga",
  "margarina", "mel", "milho de pipoca", "molho de tomate", "mostarda", "óleo",
  "pão de forma", "pão francês", "papel higiênico", "peito de peru", "presunto", "queijo",
  "refrigerante", "requeijão", "sabão em pó", "sabão líquido", "sabonete", "sal", "salame",
  "shampoo", "suco concentrado", "suco de caixa", "torrada", "vinagre", "vinho", "Ração Seca Cães",
  "Ração Úmida Sachê para gatos","ração úmida sachê para cachorro", "Ração Gatos", "Areia Sanitária", "Tapete Higiênico", "Shampoo Pet", "Condicionador Pet",
  "Escova de Pelos", "Coleira", "Guia de Passeio", "Bebedouro", "Comedouro", "Brinquedos Mordedores", "Petiscos para gatos", "petiscos para cachorros",  "Vermífugo", "Antipulgas", "Caminha", "Caixa de Transporte", "Perfume Pet", "Sabonete", "Cortador de Unha", "Focinheira",
   "Ração para Pássaros", "Ração para roedores",

  // 🔥 itens das categorias
  ...categoryMapping.frutas,
  ...categoryMapping.hortifruti,
  ...categoryMapping.congelados,

  "Outro"
]
.filter((item, index, self) => self.indexOf(item) === index) // 🔥 remove duplicados
.sort((a, b) => a.localeCompare(b, 'pt-BR'));