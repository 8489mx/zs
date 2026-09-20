import { useEffect } from 'react';
import type { StorefrontInfo, StorefrontProduct } from '../types/storefront.types';

/**
 * يضبط عنوان الصفحة ووسوم الوصف/Open Graph أثناء التصفح.
 *
 * **مكمّل لا بديل:** زواحف واتساب/فيسبوك لا تنفّذ JavaScript، وهي تُخدَّم من نقطة
 * `social-preview` في الخادم عبر قاعدة في بوابة nginx. هذا الهوك يخدم حالتين
 * أخريين: المستخدم الحقيقي (عنوان تبويب صحيح وسجل تصفّح مفهوم بدل "Z-ERP" في كل
 * صفحة)، والزواحف التي **تنفّذ** JavaScript مثل Googlebot.
 *
 * بدون أي مكتبة إضافية: تعديل مباشر على `document.head` مع تنظيف عند الخروج.
 */

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    tag.setAttribute('data-zs-seo', 'true');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  if (!href) return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('data-zs-seo', 'true');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

type Params = {
  info: StorefrontInfo | null | undefined;
  product?: StorefrontProduct | null;
};

export function useStorefrontSeo({ info, product }: Params): void {
  useEffect(() => {
    if (!info) return;

    const siteName = String(info.businessName || info.title || 'المتجر الإلكتروني').trim();
    const currency = String(info.currency || 'ج.م');

    const title = product ? `${product.name} — ${siteName}` : String(info.title || siteName);

    const description = product
      ? String(product.description || '').trim() ||
        `${product.name} متاح الآن بسعر ${Number(product.price || 0).toLocaleString('ar-EG')} ${currency} من ${siteName}.`
      : String(info.description || `تسوّق أونلاين من ${siteName} واطلب الآن.`);

    const image = String(product?.imageUrl || info.logoUrl || '');
    const url = window.location.href;

    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', product ? 'product' : 'website');
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    }
    upsertCanonical(url);
  }, [info, product]);

  // تنظيف ما أضافه الهوك عند مغادرة المتجر حتى لا تتسرب وسومه لبقية التطبيق
  useEffect(() => {
    return () => {
      document.head.querySelectorAll('[data-zs-seo="true"]').forEach((el) => el.remove());
    };
  }, []);
}
