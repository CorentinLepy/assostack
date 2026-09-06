export type PublicCopy = {
  news: string
  newsDescription: string
  noNews: string
  readArticle: string
  publishedOn: string
  backToNews: string
}

const english: PublicCopy = {
  news: 'News',
  newsDescription: 'Latest news and updates.',
  noNews: 'No news has been published yet.',
  readArticle: 'Read article',
  publishedOn: 'Published on',
  backToNews: 'Back to news',
}

const french: PublicCopy = {
  news: 'Actualités',
  newsDescription: 'Les dernières actualités et informations.',
  noNews: "Aucune actualité n'a encore été publiée.",
  readArticle: "Lire l'article",
  publishedOn: 'Publié le',
  backToNews: 'Retour aux actualités',
}

export const getPublicCopy = (locale: string): PublicCopy =>
  locale.toLowerCase().startsWith('fr') ? french : english
