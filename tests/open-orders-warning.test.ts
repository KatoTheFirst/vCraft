import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpenOrdersWarning } from "../src/components/workshop-review";
const render = (count: number) =>
  renderToStaticMarkup(createElement(OpenOrdersWarning, { count }));
test("admin sees how many unfinished wholesale orders a workshop has", () => {
  const html = render(3);
  assert.match(html, /class="warning"/);
  assert.match(
    html,
    /đang có 3 đơn sỉ dở dang \(BUYER_ACCEPTED\/IN_PRODUCTION\)/,
  );
});
test("no warning when the workshop has no open orders", () => {
  assert.equal(render(0), "");
});
