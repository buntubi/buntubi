/**
 * The frame every screen sits in: a flat hero in the client's colour beside the form, which
 * stands on the page itself. On a phone the hero folds into a brand row above the form.
 */
import type { ComponentChild } from '@fluixi/dom';
import type { Brand, Locale } from './config.js';

export interface PageProps {
  brand: Brand;
  locale: Locale;
  title: string;
  subtitle?: string;
  heroTitle: string;
  heroText: string;
  languageLabel: string;
  children?: ComponentChild;
  footer?: ComponentChild;
}

function BrandMark(props: { brand: Brand }): ComponentChild {
  return () =>
    props.brand.logo ? (
      <img class="idp-mark-logo" src={props.brand.logo} alt={props.brand.name ?? ''} />
    ) : (
      <span class="idp-mark-name">{props.brand.name ?? ''}</span>
    );
}

export function Page(props: PageProps): ComponentChild {
  const other = () => (props.locale === 'fr' ? 'en' : 'fr');
  // The same page in the other language: the query (an authorization request, a reset token) stays.
  const switchHref = () => {
    const query = new URLSearchParams(window.location.search);
    query.set('lang', other());
    return `?${query}`;
  };
  return (
    <div class="idp-shell">
      <aside class="idp-hero">
        <div class="idp-mark">
          <BrandMark brand={props.brand} />
        </div>
        <div class="idp-hero-copy">
          <p class="idp-hero-title">{() => props.heroTitle}</p>
          <p class="idp-hero-text">{() => props.heroText}</p>
        </div>
        <div class="idp-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>
      <main class="idp-main">
        <div class="idp-mark idp-mark-compact">
          <BrandMark brand={props.brand} />
        </div>
        <div class="idp-form-column">
          <header class="idp-heading">
            <h1>{() => props.title}</h1>
            {() => (props.subtitle ? <p>{props.subtitle}</p> : null)}
          </header>
          {props.children}
          <footer class="idp-footer">{props.footer}</footer>
        </div>
        <a class="idp-language" href={switchHref()} hreflang={other()}>
          {() => props.languageLabel}
        </a>
      </main>
    </div>
  );
}

export function FooterLink(props: { lead?: string; href: string; children?: ComponentChild }): ComponentChild {
  return (
    <p class="idp-footer-line">
      {() => (props.lead ? `${props.lead} ` : '')}
      <a class="idp-link" href={props.href}>
        {props.children}
      </a>
    </p>
  );
}
