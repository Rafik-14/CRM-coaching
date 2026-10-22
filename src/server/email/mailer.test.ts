import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createSmtpTransport, deliver, type SmtpSettings } from "./mailer";
import { icsEvent } from "@/lib/ics";

/**
 * Real SMTP conversation with nodemailer (connection, login, sender, recipient, message), against a tiny fake
 * SMTP server started here — so an upgrade of nodemailer is checked without the real mail account.
 */
type Received = { auth: string[]; from: string; to: string[]; data: string };

function fakeSmtpServer() {
  const received: Received[] = [];
  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let current: Received = { auth: [], from: "", to: [], data: "" };
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 fake.smtp.test ESMTP");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      while (true) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end === -1) return;
          current.data = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          received.push(current);
          current = { auth: [], from: "", to: [], data: "" };
          reply("250 OK: queued as FAKE123");
          continue;
        }
        const nl = buffer.indexOf("\r\n");
        if (nl === -1) return;
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        const cmd = line.split(" ")[0].toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") socket.write("250-fake.smtp.test\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
        else if (cmd === "AUTH") {
          current.auth.push(line);
          reply("235 Authentication successful");
        } else if (cmd === "MAIL") {
          current.from = line;
          reply("250 OK");
        } else if (cmd === "RCPT") {
          current.to.push(line);
          reply("250 OK");
        } else if (cmd === "DATA") {
          inData = true;
          reply("354 End data with <CR><LF>.<CR><LF>");
        } else if (cmd === "QUIT") {
          reply("221 Bye");
          socket.end();
        } else if (cmd === "RSET" || cmd === "NOOP") reply("250 OK");
        else reply("502 Command not implemented");
      }
    });
  });
  return { server, received };
}

describe("mailer (nodemailer over SMTP)", () => {
  const { server, received } = fakeSmtpServer();
  let settings: SmtpSettings;

  before(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as net.AddressInfo;
    settings = { host: "127.0.0.1", port, secure: false, user: "coach@test.fr", pass: "mot-de-passe-de-test" };
  });
  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("logs in and sends a confirmation with its calendar file", async () => {
    const transport = createSmtpTransport(settings);
    const ics = icsEvent({
      uid: "test@jeremygalea",
      start: new Date("2026-11-19T17:30:00Z"),
      durationMin: 90,
      summary: "Conférence · Révéler sa valeur",
    });
    const id = await deliver(transport, {
      from: "Jérémy Galéa <coach@test.fr>",
      to: "claire@example.test",
      replyTo: "coach@test.fr",
      subject: "Inscription confirmée : Révéler sa valeur",
      html: "<p>Merci Claire, votre place est réservée.</p>",
      text: "Merci Claire, votre place est réservée.",
      attachments: [{ filename: "evenement.ics", content: ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
    });
    transport.close();

    assert.ok(id, "message id returned");
    assert.equal(received.length, 1);
    const [mail] = received;
    assert.ok(mail.auth.length > 0, "logged in");
    assert.match(mail.from, /coach@test\.fr/);
    assert.deepEqual(mail.to.map((t) => /<(.+)>/.exec(t)?.[1]), ["claire@example.test"]);
    assert.match(mail.data, /^Subject: /m);
    assert.match(mail.data, /Reply-To: coach@test\.fr/);
    assert.match(mail.data, /text\/calendar/);
    assert.match(mail.data, /filename="?evenement\.ics"?/);
    assert.match(mail.data, /text\/html/);
  });

  it("refuses attachments that would read a server file or fetch a URL", async () => {
    const transport = createSmtpTransport(settings);
    const before = received.length;
    for (const attachment of [{ filename: "x.txt", path: "/etc/hostname" }, { filename: "y.txt", path: "https://example.com/" }]) {
      await assert.rejects(
        deliver(transport, {
          from: "coach@test.fr",
          to: "claire@example.test",
          subject: "Test",
          html: "<p>x</p>",
          text: "x",
          attachments: [attachment as never],
        }),
      );
    }
    transport.close();
    assert.equal(received.length, before, "nothing was sent");
  });
});
