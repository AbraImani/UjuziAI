import {
  Brain,
  Sparkles,
  Lightbulb,
  Rocket,
  Bot,
  Puzzle,
  Link,
  ShieldCheck,
  Smartphone,
  Cloud,
  GitBranch,
  Image,
  ClipboardCheck,
  Search,
  Workflow,
  Server,
  BookOpen,
  Globe,
  Hexagon,
  Code,
  Flame,
  Palette,
  Layout,
} from 'lucide-react';

const iconMap = {
  brain: Brain,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  rocket: Rocket,
  bot: Bot,
  puzzle: Puzzle,
  link: Link,
  'shield-check': ShieldCheck,
  smartphone: Smartphone,
  cloud: Cloud,
  'git-branch': GitBranch,
  image: Image,
  'clipboard-check': ClipboardCheck,
  search: Search,
  workflow: Workflow,
  server: Server,
  globe: Globe,
  hexagon: Hexagon,
  code: Code,
  flame: Flame,
  palette: Palette,
  layout: Layout,
};

export function getModuleIcon(iconName) {
  return iconMap[iconName] || BookOpen;
}

export function getTrackIcon(iconName) {
  return iconMap[iconName] || BookOpen;
}
