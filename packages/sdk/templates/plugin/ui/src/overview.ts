/**
 * {{label}}'s console page, a plain custom element. It is imported on the server too, for the
 * page's first render, so nothing here touches the browser until the element is used.
 */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

const words = {
  fr: { title: '{{label}}', lead: 'La page de cette extension dans la console.' },
  en: { title: '{{label}}', lead: "This plugin's page in the console." },
};

export class Overview extends Base {
  locale = 'fr';

  connectedCallback() {
    const said = this.locale === 'en' ? words.en : words.fr;
    const title = document.createElement('h1');
    title.textContent = said.title;
    const lead = document.createElement('p');
    lead.textContent = said.lead;
    this.replaceChildren(title, lead);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('{{id}}-overview')) customElements.define('{{id}}-overview', Overview);
