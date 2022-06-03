const ical = require("node-ical");
const http = require("http");
const pdf = require("html-pdf");
const moment = require("moment");
const express = require("express");

moment.locale("de");

const port = 3000;
const app = express();

const url = "";

const range = length => Array.from({ length }, (_, i) => i);

const last = (a) => (a ? a[a.length - 1] : "");

const createListHtmlReport = (icalData) => {
  const bracketsRegex = /\(([^)]+)\)/g;

  const nextYear = parseInt(moment().format("YYYY")) + 1;
  const limitDate = moment({ y: nextYear, M: 9, d: 1 });

  const rows = Object.keys(icalData || [])
    .filter((key) => {
      const entry = icalData[key];

      if (limitDate.isBefore(moment(entry.start)) || moment(entry.end).isBefore(moment())) {
        return false;
      }
      return true;
    })
    .sort((key1, key2) => {
      return moment(icalData[key1].start).valueOf() - moment(icalData[key2].start).valueOf();
    })
    .map((key, index) => {
      const entry = icalData[key];

      if (!entry.start || !entry.end) {
        return "";
      }

      const startDate = moment(entry.start).format("dd, DD.MM.YY");
      const endDate = moment(entry.end).format("dd, DD.MM.YY");

      const startTime = moment(entry.start).format("HH:mm");
      const endTime = moment(entry.end).format("HH:mm");

      const participants = last(entry.summary.match(bracketsRegex));

      return `
      <tr style="${index % 2 === 0 ? "background-color: #eee" : "background-color: #fff"}">
        <td style="min-width: 100px; max-width: 100px;">${
          moment(entry.end).diff(moment(entry.start)) <= 86400000 ? startDate : startDate + " - " + endDate
        }</td>
        <td style="min-width: 130px; max-width: 130px;">${startTime === endTime ? "ganztägig" : startTime + " - " + endTime + " Uhr"}</td>
        <td>${entry.summary.replace(participants, "")}</td>
        <td>${participants.slice(1, -1)}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
        <style>
          html, body {
            font-size: 10px;
          }
          th, td {
            font-size: 10px;
          }
        </style>
      </head>
      <body>
      <div style="padding: 5px;">
        <h1 style="padding: 10px 0; margin: 0;">Terminplan Intern</h1>
        <h3 style="padding: 10px 0; margin: 0;">Termine von ${moment().format("dd, DD.MM.YY")} bis ${limitDate.format("dd, DD.MM.YY")}</h3>
        <table cellpadding="10" style="text-align: left;">
          <tr>
            <th>Datum</th>
            <th>Uhrzeit</th>
            <th>Aktion</th>
            <th>Teilnehmer*innen</th>
          </tr>
          ${rows}
        </table>
      </div>
      </body>
    </html>
  `;
};


const createCalendarHtmlReport = (icalData) => {
  const indexFormat = "YYYY-MM-DD";
  const borderLine = "1px solid black";
  const year = 2022;
  const getWeekday = (day, month) => moment({ year, month, day }).isValid() ? moment({ year, month, day }).format("dd") : "";
  const getMomentDate = (day, month) => moment({ year, month, day });
  let eventsByDate = {}

  Object.values(icalData).forEach(event => {
    if (!event
      .start) {
      return;
    }
    const index = moment(event.start).format(indexFormat);
    eventsByDate[index] = (eventsByDate[index] || []).concat([event]);
  });

  return `
    <html>
      <head>
        <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
        <style>
          html, body {
            font-size: 10px;
          }
          th, td {
            font-size: 10px;
            width: 25px;
            height: 38px;
            border-right: ${borderLine};
            border-bottom: ${borderLine};
            margin: 0;
          }

          tr {
            border-top: ${borderLine};
          }

        </style>
      </head>
    <body>
    <div>
      <h1 style="padding: 10px 0; margin: 0;">Kalender ${year}</h1>
      <table cellspacing="0">
        <tr>
          ${range(32).map(day => day !== 0 ? `
            <th style="height: 20px; border-right: none;">
              ${day}
            </th>
          `: `<th style="border-right: none;"></th>`).join("")}
        </tr>
      ${moment.months().map((month, monthKey) => `
        <tr style="margin: 0;">
          <td style="border-left: ${borderLine}; background: green; text-align: center; color: white; padding-left: 5px; padding-right: 5px;">${month}</td>
          ${range(31).map(day => {
          const weekday = getWeekday(day + 1, monthKey);
          const events = eventsByDate[getMomentDate(day + 1, monthKey).format(indexFormat)] || [];
          return `
            <td style="background: ${weekday === "So" ? "#aaa" : (weekday === "Sa" ? "#ddd" : "#fff")}; vertical-align: top;">
              <span style="font-size: 7px;">${weekday}</span><br/>
              ${events.map(event => `<div style="width: 20px; overflow: hidden; white-space: nowrap; font-size: 4px;">${event.summary}</div>`).join("")}
            </td>
          `;
          }).join("")}
        </tr>
      `).join("")}
      </table>
    </div>
    </body>
    </html>
  `;
}


app.get("/list-report.pdf", async (req, res) => {
  const data = await ical.fromURL(url, {});

  const report = createListHtmlReport(data);

  pdf.create(report, { format: 'A4' }).toStream((err, pdfStream) => {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    } else {
      res.statusCode = 200;
      pdfStream.on("end", () => {
        return res.end();
      });

      res.setHeader('Content-disposition', 'inline; filename="Report.pdf"');
      res.setHeader('Content-type', 'application/pdf');

      pdfStream.pipe(res);
    }
  });
});

app.get("/calendar-report.pdf", async (req, res) => {
  const data = await ical.fromURL(url, {});

  const report = createCalendarHtmlReport(data);

  pdf.create(report, { format: 'A4', orientation: "landscape" }).toStream((err, pdfStream) => {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    } else {
      res.statusCode = 200;
      pdfStream.on("end", () => {
        return res.end();
      });

      res.setHeader('Content-disposition', 'inline; filename="Report.pdf"');
      res.setHeader('Content-type', 'application/pdf');

      pdfStream.pipe(res);
    }
  });
});


app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html")
  res.statusCode = 200;
  res.status(200).send(`
    <html>
    <head>
    </head>
    <body style="text-align:center;">
      <div style="padding: 20px;">
        <a href="/list-report.pdf">PDF als Liste</a>
      </div>
      <div style="padding: 10px;">
        <a href="/calendar-report.pdf">PDF als Kalender der Jahresübersicht</a>
      </div>
    </body>
    </html>
  `)
});

app.listen(port, function () {
  console.log("Example app listening on port " + port + "!");
});



