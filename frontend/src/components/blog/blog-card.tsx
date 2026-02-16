import Link from "next/link"
import { BlogPost } from "@/lib/blog-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User } from "lucide-react"

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Card className="flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary">{post.category}</Badge>
        </div>
        <CardTitle className="text-xl line-clamp-2 hover:text-primary transition-colors">
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {post.readTime}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {post.excerpt}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4 mt-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="bg-muted p-1 rounded-full">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium text-xs">{post.author.name}</span>
        </div>
        <Link 
          href={`/blog/${post.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Lire l'article →
        </Link>
      </CardFooter>
    </Card>
  )
}
