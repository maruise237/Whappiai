import { Metadata } from "next"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { BlogCard } from "@/components/blog/blog-card"
import { blogPosts } from "@/lib/blog-data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Blog & Ressources Whappi - Guides, Tutoriels et Actualités",
  description: "Explorez nos derniers articles sur l'automatisation WhatsApp, l'intégration d'IA, et les meilleures pratiques pour gérer vos communautés.",
  openGraph: {
    title: "Blog Whappi - L'automatisation WhatsApp expliquée",
    description: "Tutoriels, études de cas et conseils d'experts pour booster votre engagement sur WhatsApp.",
    url: "https://whappi.com/blog",
    type: "website",
  },
}

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Blog Whappi",
    "description": "Ressources et guides sur l'automatisation WhatsApp.",
    "publisher": {
      "@type": "Organization",
      "name": "Whappi",
      "logo": {
        "@type": "ImageObject",
        "url": "https://whappi.com/logo.png"
      }
    },
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "datePublished": post.date,
      "author": {
        "@type": "Person",
        "name": post.author.name
      },
      "url": `https://whappi.com/blog/${post.slug}`
    }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-24 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Blog & Ressources</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Découvrez nos guides exclusifs et nos articles pour maîtriser l'automatisation WhatsApp et booster votre engagement.
          </p>
          
          <div className="p-8 border border-border rounded-2xl bg-card shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Restez informé</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Recevez nos meilleures astuces directement dans votre boîte mail. Pas de spam, promis.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="votre@email.com" 
                className="bg-background"
              />
              <Button>S'inscrire</Button>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
