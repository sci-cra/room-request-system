/**
 * โค้ด Google Apps Script สำหรับระบบขอใช้ห้องนอกเวลาทำการ คณะวิทยาศาสตร์
 * -------------------------------------------------------------
 * วิธีใช้งาน:
 * 1. เปิด Google Sheet เปล่าๆ ขึ้นมา 1 ไฟล์
 * 2. ไปที่เมนู: ส่วนขยาย (Extensions) > Apps Script
 * 3. ลบโค้ดเดิมในนั้นออกให้หมด แล้วนำโค้ดในไฟล์นี้ไปวางแทนที่
 * 4. กดปุ่ม "บันทึก" (รูปแผ่นดิสก์)
 * 5. กดปุ่มสีน้ำเงินมุมขวาบน "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - คำอธิบาย: ระบบขอใช้ห้อง
 *    - ดำเนินการในฐานะ (Execute as): ตัวฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)  <-- สำคัญมาก! เพื่อให้ฟอร์มส่งข้อมูลได้
 * 8. กด "ทำให้ใช้งานได้" (Deploy) และให้สิทธิ์เข้าถึง (Authorize Access)
 * 9. ก๊อปปี้ "URL ของเว็บแอป" (Web App URL) ที่ได้ มาใส่ในหน้าตั้งค่าของระบบเว็บ
 */

// ชื่อแท็บใน Google Sheet
var SHEET_NAME = "คำขอใช้ห้องนอกเวลาทำการ";

// ดึงหรือสร้าง Sheet พร้อมหัวตารางอัตโนมัติ (แม้ Sheet จะว่างเปล่า)
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // ถ้ายังไม่มีหัวตาราง ให้สร้างหัวตารางให้อัตโนมัติทันที
  if (sheet.getLastRow() === 0) {
    var headers = [
      "รหัสคำขอ",
      "วันที่ยื่นคำขอ",
      "ชื่อ-นามสกุล ผู้ขอใช้ห้อง",
      "ตำแหน่ง",
      "เบอร์โทรศัพท์ (ส่วนตัว)",
      "รายวิชา / กิจกรรม",
      "ประเภทห้อง",
      "อาคาร / ชั้น / โซน",
      "หมายเลขห้อง / พื้นที่",
      "วันที่ใช้ห้อง",
      "เวลาเริ่มต้น",
      "เวลาสิ้นสุด",
      "รายละเอียดเพิ่มเติม / นศ. วิจัย",
      "ชื่อไฟล์แนบ",
      "ลิงก์ไฟล์แนบ (Google Drive)",
      "สถานะ",
      "หมายเหตุเจ้าหน้าที่"
    ];

    sheet.appendRow(headers);

    // ตกแต่งหัวตารางให้สวยงาม
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#059669"); // สีเขียวมรกต
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // จัดความกว้างคอลัมน์อัตโนมัติ
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

// ==========================================
// API GET: ดึงข้อมูลคำขอทั้งหมดไปแสดงที่หน้าเว็บ
// ==========================================
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var rows = sheet.getDataRange().getValues();
    
    // ถ้ามีแค่แถวหัวข้อ ให้ส่งอาเรย์ว่างกลับไป
    if (rows.length <= 1) {
      return responseJSON({ status: "success", data: [] });
    }

    var result = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue; // ข้ามแถวว่าง

      result.push({
        id: String(row[0]),
        createdAt: formatIsoString(row[1]),
        requesterName: String(row[2]),
        requesterPosition: String(row[3]),
        requesterPhone: String(row[4]),
        courseName: String(row[5]),
        roomType: String(row[6]),
        buildingZone: String(row[7]),
        roomNumber: String(row[8]),
        dateOfUse: formatDateValue(row[9]),
        startTime: formatTimeValue(row[10]),
        endTime: formatTimeValue(row[11]),
        additionalDetails: String(row[12] || ""),
        fileName: String(row[13] || ""),
        fileUrl: String(row[14] || ""),
        status: String(row[15] || "รอดำเนินการ"),
        adminNote: String(row[16] || "")
      });
    }

    // เรียงจากรายการล่าสุดขึ้นก่อน
    result.reverse();

    return responseJSON({ status: "success", data: result });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

// ==========================================
// API POST: บันทึกคำขอใหม่ / อัปเดตสถานะ / ลบข้อมูล
// ==========================================
function doPost(e) {
  try {
    var sheet = getOrCreateSheet();
    var payload = {};

    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || "submit";

    // กรณีที่ 1: บันทึกคำขอใหม่
    if (action === "submit") {
      var fileUrl = "";
      
      // ถ้ามีแนบไฟล์ ให้บันทึกลง Google Drive อัตโนมัติ
      if (payload.fileData && payload.fileName) {
        try {
          var folderName = "เอกสารแนบ_ขอใช้ห้องนอกเวลาทำการ";
          var folders = DriveApp.getFoldersByName(folderName);
          var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var parts = payload.fileData.split(",");
          var base64Data = parts[1] || parts[0];
          var contentType = payload.fileData.indexOf(":") > -1 
            ? payload.fileData.substring(5, payload.fileData.indexOf(";")) 
            : "application/octet-stream";

          var decoded = Utilities.base64Decode(base64Data);
          var blob = Utilities.newBlob(decoded, contentType, payload.fileName);
          var uploadedFile = targetFolder.createFile(blob);
          uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = uploadedFile.getUrl();
        } catch (uploadErr) {
          fileUrl = "เกิดข้อผิดพลาดในการบันทึกไฟล์: " + uploadErr.toString();
        }
      }

      var newRow = [
        payload.id,
        new Date(), // วันที่บันทึก
        payload.requesterName,
        payload.requesterPosition,
        "'" + payload.requesterPhone, // ใส่ ' เพื่อให้เบอร์ 0 ไม่หาย
        payload.courseName,
        payload.roomType,
        payload.buildingZone,
        payload.roomNumber,
        payload.dateOfUse,
        payload.startTime,
        payload.endTime,
        payload.additionalDetails || "",
        payload.fileName || "",
        fileUrl,
        payload.status || "รอดำเนินการ",
        payload.adminNote || ""
      ];

      sheet.appendRow(newRow);
      return responseJSON({ status: "success", message: "บันทึกข้อมูลเรียบร้อยแล้ว", id: payload.id, fileUrl: fileUrl });
    }

    // กรณีที่ 2: อัปเดตสถานะ หรือ หมายเหตุเจ้าหน้าที่
    if (action === "updateStatus") {
      var reqId = payload.id;
      var newStatus = payload.status;
      var adminNote = payload.adminNote;

      var data = sheet.getDataRange().getValues();
      var foundRow = -1;

      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]) === String(reqId)) {
          foundRow = r + 1; // 1-indexed in Google Sheets
          break;
        }
      }

      if (foundRow > 0) {
        if (newStatus) {
          sheet.getRange(foundRow, 16).setValue(newStatus); // คอลัมน์สถานะ
        }
        if (adminNote !== undefined) {
          sheet.getRange(foundRow, 17).setValue(adminNote); // คอลัมน์หมายเหตุ
        }
        return responseJSON({ status: "success", message: "อัปเดตสถานะสำเร็จ" });
      } else {
        return responseJSON({ status: "error", message: "ไม่พบรหัสคำขอนี้ในระบบ" });
      }
    }

    // กรณีที่ 3: ลบคำขอ
    if (action === "delete") {
      var reqIdToDelete = payload.id;
      var dataAll = sheet.getDataRange().getValues();
      for (var d = 1; d < dataAll.length; d++) {
        if (String(dataAll[d][0]) === String(reqIdToDelete)) {
          sheet.deleteRow(d + 1);
          return responseJSON({ status: "success", message: "ลบคำขอเรียบร้อยแล้ว" });
        }
      }
      return responseJSON({ status: "error", message: "ไม่พบรายการที่ต้องการลบ" });
    }

    return responseJSON({ status: "error", message: "ไม่พบ Action ที่ระบุ" });

  } catch (error) {
    return responseJSON({ status: "error", message: error.toString() });
  }
}

// ฟังก์ชันแปลงผลลัพธ์เป็น JSON สำหรับส่งกลับไปยัง Web App
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ตัวช่วยแปลงรูปแบบวันที่ให้อ่านง่าย
function formatDateValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + "-" + m + "-" + d;
  }
  return String(val);
}

function formatTimeValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var h = String(val.getHours()).padStart(2, '0');
    var min = String(val.getMinutes()).padStart(2, '0');
    return h + ":" + min;
  }
  return String(val);
}

function formatIsoString(val) {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}
