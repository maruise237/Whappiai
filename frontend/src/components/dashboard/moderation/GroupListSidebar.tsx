"use client";

import * as React from "react";
import { Search, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GroupListSidebarProps {
  groups: any[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function GroupListSidebar({
  groups,
  selectedGroupId,
  setSelectedGroupId,
  searchQuery,
  setSearchQuery
}: GroupListSidebarProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredGroups = groups.filter(g =>
    (g.subject || g.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-none bg-muted/10 h-auto lg:h-[calc(100vh-12rem)] flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher un groupe..."
            className="pl-8 h-8 text-[11px] bg-background border-none shadow-sm"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto p-2 gap-1 no-scrollbar">
        {filteredGroups.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroupId(group.id)}
            className={cn(
              "flex-none lg:w-full text-left p-2.5 rounded-md text-xs transition-colors flex
                items-center justify-between group whitespace-nowrap lg:whitespace-normal",
              selectedGroupId === group.id
                ? "bg-primary/10 text-primary font-bold shadow-sm"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <span className="truncate flex-1 lg:pr-2">{group.subject || group.name || "Groupe sans nom"}</span>
            <ChevronRight className={cn("h-3 w-3 hidden lg:block", selectedGroupId !== group.id && "opacity-0")} />
          </button>
        ))}
        {filteredGroups.length === 0 && (
          <p className="text-center py-10 text-[10px] text-muted-foreground italic uppercase opacity-40">
            Aucun groupe
          </p>
        )}
      </div>
    </Card>
  );
}
