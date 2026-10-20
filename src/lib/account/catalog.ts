import type { Article, CategoryId, Locale } from '../types';

/**
 * What a user can follow. Ids are stored in the database and must match the CHECK constraints in
 * supabase/migrations/20261020000000_accounts.sql. Matching uses only fields the collector already
 * produces (category, entities, brand, title, excerpt); nothing is sent anywhere.
 */
export type TopicId =
  | 'models'
  | 'tools'
  | 'research'
  | 'open-source'
  | 'agents'
  | 'business'
  | 'hardware'
  | 'policy-safety'
  | 'design'
  | 'coding';

export type CompanyId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'nvidia'
  | 'microsoft'
  | 'huggingface'
  | 'amazon'
  | 'apple'
  | 'mistral'
  | 'xai'
  | 'deepseek'
  | 'alibaba';

export interface Topic {
  id: TopicId;
  label: Record<Locale, string>;
  /** Existing collector categories that count as this topic. */
  categories: CategoryId[];
  /** Extra title/excerpt keywords for topics that cut across categories. */
  keywords?: RegExp;
}

export interface Company {
  id: CompanyId;
  /** Display name in Latin script in both languages (brand names are not translated). */
  name: string;
  /** Products shown under the name. */
  products: string;
  /** Collector brand ids (Claude/OpenAI/Gemini art keys) that belong to this company. */
  brands?: Article['brand'][];
}

export const TOPICS: readonly Topic[] = [
  { id: 'models', label: { en: 'AI Models & Releases', fa: 'مدل‌ها و عرضه‌های تازه' }, categories: ['models'] },
  { id: 'tools', label: { en: 'AI Tools & Developer Products', fa: 'ابزارها و محصولات توسعه‌دهندگان' }, categories: ['products'] },
  { id: 'research', label: { en: 'AI Research', fa: 'پژوهش هوش مصنوعی' }, categories: ['research'] },
  { id: 'open-source', label: { en: 'Open Source', fa: 'متن‌باز' }, categories: ['open-source'] },
  {
    id: 'agents',
    label: { en: 'Robotics & Agents', fa: 'رباتیک و ایجنت‌ها' },
    categories: [],
    keywords: /\b(robot\w*|humanoid\w*|agent|agents|agentic|autonomous)\b/i,
  },
  { id: 'business', label: { en: 'Business & Funding', fa: 'کسب‌وکار و سرمایه‌گذاری' }, categories: ['business'] },
  { id: 'hardware', label: { en: 'Chips & AI Infrastructure', fa: 'تراشه و زیرساخت هوش مصنوعی' }, categories: ['hardware'] },
  { id: 'policy-safety', label: { en: 'Policy & Safety', fa: 'سیاست‌گذاری و ایمنی' }, categories: ['policy', 'safety'] },
  {
    id: 'design',
    label: { en: 'AI in Design & Architecture', fa: 'هوش مصنوعی در طراحی و معماری' },
    categories: [],
    // "architecture" alone usually means model architecture, so only design-practice words count.
    keywords: /\b(designers?|graphic design|product design|UX|UI design|Figma|Adobe|Canva|Firefly|architects?|architectural|BIM|CAD|interior design|urban design)\b/i,
  },
  {
    id: 'coding',
    label: { en: 'AI Coding Assistants', fa: 'دستیارهای برنامه‌نویسی' },
    categories: [],
    keywords: /\b(coding|code assistant|Copilot|Codex|Claude Code|Cursor|Windsurf|programming|programmers?|software engineer\w*|IDE|vibe cod\w*)\b/i,
  },
];

export const COMPANIES: readonly Company[] = [
  { id: 'anthropic', name: 'Anthropic', products: 'Claude', brands: ['claude'] },
  { id: 'openai', name: 'OpenAI', products: 'ChatGPT · GPT · Sora', brands: ['openai'] },
  { id: 'google', name: 'Google', products: 'Gemini · DeepMind', brands: ['gemini'] },
  { id: 'meta', name: 'Meta AI', products: 'Llama' },
  { id: 'nvidia', name: 'NVIDIA', products: 'GPUs · CUDA' },
  { id: 'microsoft', name: 'Microsoft AI', products: 'Copilot · Azure' },
  { id: 'huggingface', name: 'Hugging Face', products: 'Hub · open models' },
  { id: 'amazon', name: 'Amazon', products: 'AWS · Bedrock' },
  { id: 'apple', name: 'Apple', products: 'Apple Intelligence' },
  { id: 'mistral', name: 'Mistral AI', products: 'Mistral · Le Chat' },
  { id: 'xai', name: 'xAI', products: 'Grok' },
  { id: 'deepseek', name: 'DeepSeek', products: 'DeepSeek models' },
  { id: 'alibaba', name: 'Alibaba', products: 'Qwen' },
];

export const TOPIC_IDS = TOPICS.map((t) => t.id);
export const COMPANY_IDS = COMPANIES.map((c) => c.id);

export const isTopicId = (v: unknown): v is TopicId => typeof v === 'string' && (TOPIC_IDS as string[]).includes(v);
export const isCompanyId = (v: unknown): v is CompanyId => typeof v === 'string' && (COMPANY_IDS as string[]).includes(v);

export const topicById = (id: TopicId): Topic => TOPICS.find((t) => t.id === id)!;
export const companyById = (id: CompanyId): Company => COMPANIES.find((c) => c.id === id)!;

type Matchable = Pick<Article, 'category' | 'entities' | 'brand' | 'title' | 'excerpt'>;

export function matchesTopic(a: Matchable, topic: Topic): boolean {
  if (topic.categories.includes(a.category)) return true;
  return !!topic.keywords && topic.keywords.test(`${a.title} ${a.excerpt}`);
}

export function matchesCompany(a: Matchable, company: Company): boolean {
  if ((a.entities ?? []).includes(company.id)) return true;
  return !!a.brand && !!company.brands?.includes(a.brand);
}
