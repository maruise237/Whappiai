import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { blogPosts } from "@/lib/blog-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, User, Share2 } from "lucide-react"

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return {
      title: "Article non trouvé - Whappi",
    }
  }

  return {
    title: `${post.title} - Blog Whappi`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      url: `https://whappi.com/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    notFound()
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.date,
    "author": {
      "@type": "Person",
      "name": post.author.name
    },
    "publisher": {
      "@type": "Organization",
      "name": "Whappi",
      "logo": {
        "@type": "ImageObject",
        "url": "https://whappi.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://whappi.com/blog/${post.slug}`
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/blog" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour au blog
          </Link>
        </Button>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <div className="mb-8 not-prose">
            <Badge className="mb-4">{post.category}</Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground border-b pb-8">
              <div className="flex items-center gap-2">
                <div className="bg-muted p-2 rounded-full">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{post.author.name}</p>
                  <p className="text-xs">{post.author.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                {post.date}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </div>
            </div>
          </div>

          <div 
            className="blog-content space-y-6"
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />
          
          <div className="mt-12 pt-8 border-t flex justify-between items-center not-prose">
            <p className="font-semibold">Partager cet article</p>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
