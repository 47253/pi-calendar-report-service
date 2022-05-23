const ical = require("node-ical");
const http = require("http");
const pdf = require("html-pdf");
const moment = require("moment");
const express = require("express");

moment.locale("de");

const port = 8005;
const app = express();

const url =
  "https://calendar.google.com/calendar/ical/iuuu.de_j8npqqc0km43cnetsb1bkb2gl4%40group.calendar.google.com/private-3fee126cdc740a584924e5f821068b29/basic.ics";

const options = {};

const last = (a) => (a ? a[a.length - 1] : "");

const createHtmlReport = (icalData) => {
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

app.get("/report.pdf", async (req, res) => {
  const data = await ical.fromURL(url, {});

  const report = createHtmlReport(data);

  pdf.create(report, { format: 'A4' }).toStream((err, pdfStream) => {
    if (err) {
      // handle error and return a error response code
      console.log(err);
      return res.sendStatus(500);
    } else {
      // send a status code of 200 OK
      res.statusCode = 200;

      // once we are done reading end the response
      pdfStream.on("end", () => {
        // done reading
        return res.end();
      });

      // pipe the contents of the PDF directly to the response

      res.setHeader('Content-disposition', 'inline; filename="Report.pdf"');
      res.setHeader('Content-type', 'application/pdf');

      pdfStream.pipe(res);
    }
  });
});

app.listen(port, function () {
  console.log("Example app listening on port " + port + "!");
});

// http
//   .createServer((req, res) => {
//     ical.fromURL(url, options, (err, data) => {

//       if(data) {
//         if (err) {
//           res.end(err.message);
//         }

//         const html = "";

//         pdf.create(html).toStream((err, pdfStream) => {
//           if (err) {
//             // handle error and return a error response code
//             console.log(err)
//             return res.sendStatus(500)
//           } else {
//             // send a status code of 200 OK
//             res.statusCode = 200

//             // once we are done reading end the response
//             pdfStream.on('end', () => {
//               // done reading
//               return res.end()
//             })

//             // pipe the contents of the PDF directly to the response
//             pdfStream.pipe(res)
//           }
//         })

//         // jsreport
//         //   .render({
//         //     template: {
//         //       content: createHtmlReport(data),
//         //       engine: "handlebars",
//         //       recipe: "phantom-pdf",
//         //     },
//         //     data: { name: "jsreport" },
//         //   })
//         //   .then((out) => {
//         //     out.stream.pipe(res);
//         //   }).catch(err => {
//         //     console.log(err)
//         //   })
//       }

//     });
//   })
//   .listen(8005, "127.0.0.1");
