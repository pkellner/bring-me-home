import { escapeHtml } from '../html-escape';

describe('escapeHtml', () => {
  it('escapes the five characters that can change HTML structure', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes an ampersand before other entities, so entities are not double-decoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves ordinary text and email addresses unchanged', () => {
    expect(escapeHtml('owner+tag@example.com')).toBe('owner+tag@example.com');
    expect(escapeHtml('')).toBe('');
  });

  it('escapes every occurrence', () => {
    expect(escapeHtml('<a><b>')).toBe('&lt;a&gt;&lt;b&gt;');
  });

  it('neutralises a script-closing payload', () => {
    expect(escapeHtml('</script><script>x()</script>')).toBe(
      '&lt;/script&gt;&lt;script&gt;x()&lt;/script&gt;'
    );
  });
});
