import {
  Atom,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Brush,
  Calculator,
  Calendar,
  Camera,
  ChartLine,
  Clock,
  Code,
  Coffee,
  Cpu,
  Database,
  DollarSign,
  Dumbbell,
  FileText,
  Flag,
  FlaskConical,
  Footprints,
  Gamepad2,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  HeartPulse,
  House,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  Mic,
  Microscope,
  Moon,
  Music,
  NotebookPen,
  Palette,
  PenTool,
  Plane,
  Rocket,
  Shapes,
  Sigma,
  Star,
  Sun,
  Target,
  Terminal,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Outline icons offered for projects, keyed by the name stored after `lucide:`. */
export const PROJECT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  BookOpen: { icon: BookOpen, label: "Sách" },
  NotebookPen: { icon: NotebookPen, label: "Ghi chép" },
  GraduationCap: { icon: GraduationCap, label: "Học tập" },
  Languages: { icon: Languages, label: "Ngôn ngữ" },
  Globe: { icon: Globe, label: "Thế giới" },
  FileText: { icon: FileText, label: "Tài liệu" },
  Sigma: { icon: Sigma, label: "Toán" },
  Calculator: { icon: Calculator, label: "Tính toán" },
  Atom: { icon: Atom, label: "Vật lý" },
  FlaskConical: { icon: FlaskConical, label: "Hoá học" },
  Microscope: { icon: Microscope, label: "Nghiên cứu" },
  Brain: { icon: Brain, label: "Tư duy" },
  Code: { icon: Code, label: "Code" },
  Terminal: { icon: Terminal, label: "Terminal" },
  Laptop: { icon: Laptop, label: "Máy tính" },
  Cpu: { icon: Cpu, label: "Phần cứng" },
  Database: { icon: Database, label: "Dữ liệu" },
  ChartLine: { icon: ChartLine, label: "Phân tích" },
  Briefcase: { icon: Briefcase, label: "Công việc" },
  Users: { icon: Users, label: "Nhóm" },
  Target: { icon: Target, label: "Mục tiêu" },
  Trophy: { icon: Trophy, label: "Thành tích" },
  Flag: { icon: Flag, label: "Cột mốc" },
  Rocket: { icon: Rocket, label: "Dự án" },
  Lightbulb: { icon: Lightbulb, label: "Ý tưởng" },
  Shapes: { icon: Shapes, label: "Thiết kế" },
  PenTool: { icon: PenTool, label: "Vẽ" },
  Brush: { icon: Brush, label: "Hội hoạ" },
  Palette: { icon: Palette, label: "Màu sắc" },
  Camera: { icon: Camera, label: "Nhiếp ảnh" },
  Music: { icon: Music, label: "Âm nhạc" },
  Headphones: { icon: Headphones, label: "Nghe" },
  Mic: { icon: Mic, label: "Nói" },
  Gamepad2: { icon: Gamepad2, label: "Game" },
  Dumbbell: { icon: Dumbbell, label: "Tập gym" },
  Footprints: { icon: Footprints, label: "Chạy bộ" },
  Bike: { icon: Bike, label: "Đạp xe" },
  HeartPulse: { icon: HeartPulse, label: "Sức khoẻ" },
  Heart: { icon: Heart, label: "Yêu thích" },
  Leaf: { icon: Leaf, label: "Thiên nhiên" },
  Coffee: { icon: Coffee, label: "Cà phê" },
  Sun: { icon: Sun, label: "Buổi sáng" },
  Moon: { icon: Moon, label: "Buổi tối" },
  Star: { icon: Star, label: "Ưu tiên" },
  Clock: { icon: Clock, label: "Thời gian" },
  Calendar: { icon: Calendar, label: "Lịch" },
  House: { icon: House, label: "Nhà" },
  Plane: { icon: Plane, label: "Du lịch" },
  Wallet: { icon: Wallet, label: "Tài chính" },
  DollarSign: { icon: DollarSign, label: "Kiếm tiền" },
};

const PREFIX = "lucide:";

export const iconValue = (name: string) => `${PREFIX}${name}`;

export function iconName(value: string | null | undefined): string | null {
  return value?.startsWith(PREFIX) ? value.slice(PREFIX.length) : null;
}

/**
 * A project's icon: one of the outline icons drawn in the project colour, or
 * (for older projects) the emoji / text that was typed.
 */
export function ProjectIcon({
  icon,
  color,
  className,
}: {
  icon: string | null | undefined;
  color: string;
  className?: string;
}) {
  if (!icon) return null;
  const entry = PROJECT_ICONS[iconName(icon) ?? ""];
  if (entry) {
    const Icon = entry.icon;
    return <Icon className={cn("size-4 shrink-0", className)} style={{ color }} strokeWidth={2} aria-hidden="true" />;
  }
  return <span className={cn("shrink-0 leading-none", className)}>{icon}</span>;
}
