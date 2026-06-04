export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  readTime: string;
  author: {
    name: string;
    role: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    title: "Comment automatiser votre support client sur WhatsApp en 2026",
    slug: "automatiser-support-client-whatsapp",
    excerpt: "Découvrez les dernières tendances et outils pour offrir une assistance instantanée à vos clients.",
    content: `
      <p>L'automatisation du support client sur WhatsApp est devenue une nécessité pour les entreprises modernes. En 2026, l'IA permet d'aller bien au-delà des simples réponses automatiques.</p>
      <p>La réactivité est la clé de la satisfaction client. Sur WhatsApp, les utilisateurs s'attendent à une réponse quasi-immédiate. L'automatisation permet de :</p>
      <ul>
        <li>Réduire le temps de réponse à moins d'une minute</li>
        <li>Gérer les questions fréquentes 24h/24</li>
        <li>Libérer vos agents pour des tâches à plus haute valeur ajoutée</li>
      </ul>
    `,
    date: "2026-03-15",
    category: "Automatisation",
    readTime: "5 min",
    author: {
      name: "Jean Dupont",
      role: "Product Manager"
    }
  },
  {
    title: "Meilleures pratiques pour éviter le spam et rester conforme",
    slug: "meilleures-pratiques-anti-spam-2026",
    excerpt: "Tout ce que vous devez savoir sur les politiques de WhatsApp et comment protéger votre numéro.",
    content: `
      <p>Maintenir un numéro de téléphone en bonne santé sur WhatsApp nécessite de suivre des règles strictes. Voici nos conseils pour 2026.</p>
      <p>Ne jamais envoyer de message à un utilisateur qui n'a pas explicitement accepté de recevoir vos communications. Utilisez des méthodes claires d'opt-in : formulaire web, case à cocher, ou premier message initié par l'utilisateur.</p>
    `,
    date: "2026-03-10",
    category: "Conformité",
    readTime: "7 min",
    author: {
      name: "Marie Claire",
      role: "Expert Conformité"
    }
  },
  {
    title: "Étude de cas : Comment une marque locale a boosté son engagement de 300%",
    slug: "etude-cas-engagement-ia",
    excerpt: "Analyse détaillée de l'implémentation de Whappi pour une boutique e-commerce.",
    content: `
      <p>Notre client, une marque de vêtements éco-responsables, gérait une communauté de 5000 clients fidèles sur WhatsApp. Le problème ? Les newsletters génériques avaient un taux d'ouverture en baisse et peu d'interactions.</p>
    `,
    date: "2026-03-05",
    category: "Étude de cas",
    readTime: "6 min",
    author: {
      name: "Paul Martin",
      role: "Growth Marketer"
    }
  }
];
