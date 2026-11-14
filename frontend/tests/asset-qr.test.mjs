import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { PNG } from "pngjs";
const mod = await import("../src/features/AsetIT/assetQr.js").catch(() => ({}));
const uuid = "cbd402ef-c02e-42a3-b090-26311c541d14";
test("QR URLs use controlled frontend base with stable public path and loopback warning", () => {
  assert.equal(typeof mod.verificationUrl, "function");
  assert.equal(
    mod.verificationUrl(uuid, "https://school.example/letris/"),
    "https://school.example/letris/verifikasi-aset/" + uuid,
  );
  assert.equal(
    mod.verificationUrl(uuid, "http://192.0.2.10:5174"),
    "http://192.0.2.10:5174/verifikasi-aset/" + uuid,
  );
  for (const base of [
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "https://example.com/?x=1",
    "https://example.com/#foo",
  ])
    assert.throws(() => mod.verificationUrl(uuid, base));
  assert.throws(() => mod.verificationUrl("1", "https://school.example"));
  for (const base of [
    "http://localhost:5174",
    "http://127.0.0.2",
    "http://[::1]",
    "http://0.0.0.0",
    "http://foo.localhost",
  ])
    assert.equal(mod.isLoopback(base), true);
  assert.equal(mod.isLoopback("https://school.example"), false);
});
test("canonical loopback aliases cannot produce non-preview PDFs", async () => {
  for (const host of ['localhost.', 'foo.localhost.', '127.255.2.3', '127.1', '2130706433', '[0:0:0:0:0:0:0:1]', '[::ffff:127.0.0.1]', '[::ffff:127.255.2.3]', '[0:0:0:0:0:ffff:7f00:2]']) {
    const base = `http://${host}`;
    assert.equal(mod.isLoopback(base), true, base);
    await assert.rejects(mod.buildLabelPdf([{public_id:uuid}], {base}), /LAN/, base);
  }
  for (const base of ['http://192.168.1.10', 'https://school.example.', 'http://[::ffff:192.168.1.1]', 'https://notlocalhost.example']) assert.equal(mod.isLoopback(base), false, base);
  for (const base of ['garbage', 'ftp://school.example', 'javascript:alert(1)', 'http://[broken]']) await assert.rejects(mod.buildLabelPdf([{public_id:uuid}], {base}));
});
test("print job suppresses duplicate clicks, cleans failed popup, retries and delivers real PDF", async () => {
  assert.equal(typeof mod.createLabelPrintJob, "function");
  let opens = 0,
    prints = 0,
    closed = 0,
    release,
    fail = true;
  const gate = new Promise((r) => (release = r));
  const job = mod.createLabelPrintJob({
    open: () => {
      opens++;
      return { close: () => closed++ };
    },
    build: async () => {
      await gate;
      if (fail) throw Error("build failed");
      return { real: "pdf" };
    },
    print: async (pdf) => {
      assert.equal(pdf.real, "pdf");
      prints++;
    },
  });
  const first = job([], {});
  assert.equal(await job([], {}), false);
  release();
  await assert.rejects(first, /build failed/);
  assert.equal(closed, 1);
  fail = false;
  assert.equal(await job([], {}), true);
  assert.equal(opens, 2);
  assert.equal(prints, 1);
  const pdf = await mod.buildLabelPdf(
    [
      {
        public_id: uuid,
        nama_perangkat: "Printer <script>",
        nomor_inventaris: "INV7",
        kategori: "Printer",
      },
    ],
    { base: "https://school.example" },
  );
  assert.match(pdf.output(), /^%PDF-/);
  assert.match(pdf.output(), /INV7/);
  assert.match(pdf.output(), /Printer/);
  await assert.rejects(
    () =>
      mod.buildLabelPdf([{ public_id: uuid }], {
        base: "http://localhost:5174",
      }),
    /LAN/,
  );
});
test("actual QR PNG independently decodes to exact verification URL", async () => {
  assert.equal(typeof mod.encodeQr, "function");
  const url = mod.verificationUrl(uuid, "https://school.example/letris/");
  const data = await mod.encodeQr(url);
  assert.match(data, /^data:image\/png;base64,/);
  const png = PNG.sync.read(Buffer.from(data.split(",")[1], "base64"));
  assert.equal(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    url,
  );
});
