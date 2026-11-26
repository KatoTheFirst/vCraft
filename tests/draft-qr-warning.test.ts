import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftQrWarning } from "../src/components/product-manager";
const render = (published: boolean) =>
  renderToStaticMarkup(createElement(DraftQrWarning, { published }));
test("QR block warns that a draft product's trace page is not public yet", () => {
  const html = render(false);
  assert.match(html, /class="warning"/);
  assert.match(html, /Nháp/);
  assert.match(html, /Công khai trên trang triển lãm/);
});
test("no warning once the product is published", () => {
  assert.equal(render(true), "");
});
