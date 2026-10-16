using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Win32;

namespace ZSystems.HardwareBridge
{
    static class Program
    {
        private const int Port = 18181;
        private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
        private static readonly DateTime StartTime = DateTime.UtcNow;
        private static readonly List<HttpListenerResponse> SseClients = new List<HttpListenerResponse>();
        private static readonly object SseLock = new object();
        private static HttpListener _listener;
        private static NotifyIcon _trayIcon;

        [STAThread]
        static void Main()
        {
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "debug.log");
            try
            {
                File.AppendAllText(logPath, "--- Main Started " + DateTime.Now + " ---\n");
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                bool createdNew;
                using (Mutex mutex = new Mutex(true, "ZSystemsHardwareBridge_SingleInstanceMutex", out createdNew))
                {
                    File.AppendAllText(logPath, "Step 1: createdNew=" + createdNew + "\n");
                    if (!createdNew)
                    {
                        File.AppendAllText(logPath, "Exiting because createdNew is false\n");
                        return;
                    }

                File.AppendAllText(logPath, "Step 2: Startup registry\n");
                // 2. Automatically register in Windows Startup (Autostart on boot)
                try
                {
                    string exePath = Application.ExecutablePath;
                    using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (key != null)
                        {
                            key.SetValue("ZSystemsHardwareBridge", "\"" + exePath + "\"");
                        }
                    }
                }
                catch (Exception regEx) { File.AppendAllText(logPath, "Reg error: " + regEx.Message + "\n"); }

                File.AppendAllText(logPath, "Step 3: Starting listener\n");
                // 3. Start HTTP bridge server on background thread
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", Port));
                    _listener.Prefixes.Add(string.Format("http://localhost:{0}/", Port));
                    _listener.Start();

                    Thread listenerThread = new Thread(ListenLoop);
                    listenerThread.IsBackground = true;
                    listenerThread.Start();
                    File.AppendAllText(logPath, "Listener started successfully on port " + Port + "\n");
                }
                catch (Exception ex)
                {
                    File.AppendAllText(logPath, "Listener start failed: " + ex.ToString() + "\n");
                    return;
                }

                File.AppendAllText(logPath, "Step 4: TrayIcon\n");

                // 4. Create System Tray Icon
                _trayIcon = new NotifyIcon();
                _trayIcon.Icon = SystemIcons.Shield;
                _trayIcon.Text = "جسر Z-Systems للعتاد (نشط - 127.0.0.1:18181)";
                _trayIcon.Visible = true;

                ContextMenu menu = new ContextMenu();
                menu.MenuItems.Add(new MenuItem("جسر Z-Systems للعتاد v1.0.0") { Enabled = false });
                menu.MenuItems.Add(new MenuItem("الحالة: متصل (127.0.0.1:18181)") { Enabled = false });
                menu.MenuItems.Add("-");
                menu.MenuItems.Add("فتح لوحة التشخيص والفحص", (s, e) =>
                {
                    try { System.Diagnostics.Process.Start("http://127.0.0.1:18181/diagnostics"); } catch {}
                });
                menu.MenuItems.Add("إلغاء التشغيل التلقائي مع الويندوز", (s, e) =>
                {
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                        {
                            if (key != null) key.DeleteValue("ZSystemsHardwareBridge", false);
                        }
                        MessageBox.Show("تم إلغاء التشغيل التلقائي بنجاح.", "جسر Z-Systems", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    catch {}
                });
                menu.MenuItems.Add("-");
                menu.MenuItems.Add("إيقاف وخروج", (s, e) =>
                {
                    _trayIcon.Visible = false;
                    try { _listener.Stop(); } catch {}
                    Application.Exit();
                });

                _trayIcon.ContextMenu = menu;
                _trayIcon.DoubleClick += (s, e) =>
                {
                    try { System.Diagnostics.Process.Start("http://127.0.0.1:18181/diagnostics"); } catch {}
                };

                // Notification Balloon
                _trayIcon.ShowBalloonTip(
                    3000,
                    "جسر Z-Systems للعتاد",
                    "الجسر نشط الآن في الخلفية وجاهز للربط مع نقاط البيع والماكينات.",
                    ToolTipIcon.Info
                );

                Application.Run(new ApplicationContext());
                }
            }
            catch (Exception ex)
            {
                try { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge-error.log"), ex.ToString()); } catch {}
                MessageBox.Show(ex.ToString(), "Bridge Startup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void ListenLoop()
        {
            while (_listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    if (_listener == null || !_listener.IsListening) break;
                }
            }
        }

        private static void BroadcastSse(string type, object data)
        {
            lock (SseLock)
            {
                string payload = Serializer.Serialize(new Dictionary<string, object>
                {
                    { "type", type },
                    { "data", data },
                    { "timestamp", DateTime.UtcNow.ToString("o") }
                });

                byte[] bytes = Encoding.UTF8.GetBytes(string.Format("data: {0}\n\n", payload));
                List<HttpListenerResponse> deadClients = new List<HttpListenerResponse>();

                foreach (var client in SseClients)
                {
                    try
                    {
                        client.OutputStream.Write(bytes, 0, bytes.Length);
                        client.OutputStream.Flush();
                    }
                    catch
                    {
                        deadClients.Add(client);
                    }
                }

                foreach (var dead in deadClients)
                {
                    SseClients.Remove(dead);
                }
            }
        }

        private static void SetCorsHeaders(HttpListenerContext context)
        {
            var res = context.Response;
            res.Headers["Access-Control-Allow-Origin"] = "*";
            res.Headers["Access-Control-Allow-Private-Network"] = "true";
            res.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE";
            res.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-pairing-key, X-Requested-With";
        }

        private static void SendJson(HttpListenerContext context, int statusCode, object data)
        {
            try
            {
                SetCorsHeaders(context);
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json; charset=utf-8";

                string json = Serializer.Serialize(data);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                context.Response.OutputStream.Close();
            }
            catch {}
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                SetCorsHeaders(context);

                if (context.Request.HttpMethod == "OPTIONS")
                {
                    context.Response.StatusCode = 204;
                    context.Response.OutputStream.Close();
                    return;
                }

                string path = context.Request.Url.AbsolutePath.ToLowerInvariant();

                // 1. Health & Ping
                if (path == "/health" || path == "/ping")
                {
                    SendJson(context, 200, new Dictionary<string, object>
                    {
                        { "status", "ONLINE" },
                        { "name", "Z-Systems Hardware Bridge" },
                        { "version", "1.0.0" },
                        { "runtime", "Windows Native Service" },
                        { "uptimeSec", (int)(DateTime.UtcNow - StartTime).TotalSeconds }
                    });
                    return;
                }

                // 2. Diagnostics UI
                if (path == "/" || path == "/diagnostics" || path == "/index.html")
                {
                    ServeDiagnosticsHtml(context);
                    return;
                }

                // 3. SSE Stream
                if (path == "/events" || path == "/api/events")
                {
                    context.Response.StatusCode = 200;
                    context.Response.ContentType = "text/event-stream";
                    context.Response.Headers["Cache-Control"] = "no-cache";
                    byte[] initBytes = Encoding.UTF8.GetBytes("data: {\"type\":\"connected\",\"version\":\"1.0.0\"}\n\n");
                    context.Response.OutputStream.Write(initBytes, 0, initBytes.Length);
                    context.Response.OutputStream.Flush();

                    lock (SseLock)
                    {
                        SseClients.Add(context.Response);
                    }
                    return;
                }

                // Read request body for POST endpoints
                string body = "";
                if (context.Request.HasEntityBody)
                {
                    using (StreamReader reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        body = reader.ReadToEnd();
                    }
                }

                Dictionary<string, object> jsonBody = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(body))
                {
                    try { jsonBody = Serializer.Deserialize<Dictionary<string, object>>(body); } catch {}
                }

                // 4. ECR Charge
                if (path == "/api/ecr/charge" && context.Request.HttpMethod == "POST")
                {
                    HandleEcrCharge(context, jsonBody);
                    return;
                }

                // 5. ECR Cancel
                if (path == "/api/ecr/cancel" && context.Request.HttpMethod == "POST")
                {
                    HandleEcrCancel(context, jsonBody);
                    return;
                }

                // 6. ECR Test Connection
                if (path == "/api/ecr/test" && context.Request.HttpMethod == "POST")
                {
                    HandleEcrTest(context, jsonBody);
                    return;
                }

                // 7. Thermal Printer Print
                if (path == "/api/printer/print" && context.Request.HttpMethod == "POST")
                {
                    HandlePrinterPrint(context, jsonBody);
                    return;
                }

                // 8. Thermal Printer Test Receipt
                if (path == "/api/printer/test" && context.Request.HttpMethod == "POST")
                {
                    HandlePrinterTest(context, jsonBody);
                    return;
                }

                // 9. Kick Cash Drawer
                if (path == "/api/printer/kick-drawer" && context.Request.HttpMethod == "POST")
                {
                    HandleKickDrawer(context, jsonBody);
                    return;
                }

                // Not found
                SendJson(context, 404, new Dictionary<string, object>
                {
                    { "success", false },
                    { "error", "Endpoint not found: " + path }
                });
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object>
                {
                    { "success", false },
                    { "error", ex.Message }
                });
            }
        }

        private static void ServeDiagnosticsHtml(HttpListenerContext context)
        {
            string html = "";
            try
            {
                using (Stream stream = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("diagnostics.html"))
                {
                    if (stream != null)
                    {
                        using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                        {
                            html = reader.ReadToEnd();
                        }
                    }
                }
            }
            catch {}

            if (string.IsNullOrEmpty(html))
            {
                string[] possiblePaths = new string[]
                {
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "ui", "diagnostics.html"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "diagnostics.html")
                };

                foreach (var p in possiblePaths)
                {
                    if (File.Exists(p))
                    {
                        html = File.ReadAllText(p, Encoding.UTF8);
                        break;
                    }
                }
            }

            if (string.IsNullOrEmpty(html))
            {
                html = "<!DOCTYPE html><html dir='rtl'><head><meta charset='utf-8'><title>Z-Systems Bridge</title></head><body><h1>جسر Z-Systems للعتاد نشط ومستعد</h1><p>الحالة: متصل (127.0.0.1:18181)</p></body></html>";
            }

            byte[] bytes = Encoding.UTF8.GetBytes(html);
            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/html; charset=utf-8";
            context.Response.ContentLength64 = bytes.Length;
            context.Response.OutputStream.Write(bytes, 0, bytes.Length);
            context.Response.OutputStream.Close();
        }

        private static void HandleEcrCharge(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 8080;
            decimal amount = body.ContainsKey("amount") ? Convert.ToDecimal(body["amount"]) : 0;
            string currency = body.ContainsKey("currency") ? Convert.ToString(body["currency"]) : "EGP";
            string refId = body.ContainsKey("referenceId") ? Convert.ToString(body["referenceId"]) : "ECR-" + DateTime.UtcNow.Ticks;
            string provider = body.ContainsKey("provider") ? Convert.ToString(body["provider"]).ToLowerInvariant() : "fawry";

            if (string.IsNullOrEmpty(ip) || amount <= 0)
            {
                SendJson(context, 400, new Dictionary<string, object>
                {
                    { "success", false },
                    { "error", "يجب تحديد عنوان IP والمبلغ المطلوب" }
                });
                return;
            }

            BroadcastSse("ecr_waiting", new Dictionary<string, object>
            {
                { "amount", amount },
                { "currency", currency },
                { "ip", ip },
                { "port", port },
                { "referenceId", refId }
            });

            try
            {
                string targetUrl = string.Format("http://{0}:{1}/poslink", ip, port);
                if (provider.Contains("geidea"))
                {
                    targetUrl = string.Format("http://{0}:{1}/api/v1/payment", ip, port);
                }

                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(targetUrl);
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Timeout = 120000;

                var requestPayload = new Dictionary<string, object>
                {
                    { "transType", "SALE" },
                    { "amount", Convert.ToInt64(amount * 100) },
                    { "currency", currency },
                    { "ecrReference", refId }
                };

                byte[] postBytes = Encoding.UTF8.GetBytes(Serializer.Serialize(requestPayload));
                req.ContentLength = postBytes.Length;
                using (Stream stream = req.GetRequestStream())
                {
                    stream.Write(postBytes, 0, postBytes.Length);
                }

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                using (StreamReader reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    string respJson = reader.ReadToEnd();
                    var dict = Serializer.Deserialize<Dictionary<string, object>>(respJson);

                    bool isApproved = (dict.ContainsKey("status") && Convert.ToString(dict["status"]).ToUpperInvariant() == "APPROVED") ||
                                      (dict.ContainsKey("responseCode") && Convert.ToString(dict["responseCode"]) == "000000");

                    BroadcastSse(isApproved ? "ecr_approved" : "ecr_declined", dict);

                    SendJson(context, 200, new Dictionary<string, object>
                    {
                        { "success", isApproved },
                        { "status", isApproved ? "approved" : "declined" },
                        { "data", dict }
                    });
                }
            }
            catch (Exception ex)
            {
                BroadcastSse("ecr_error", new Dictionary<string, object> { { "error", ex.Message } });
                SendJson(context, 500, new Dictionary<string, object>
                {
                    { "success", false },
                    { "error", "فشل التخاطب مع ماكينة الدفع: " + ex.Message }
                });
            }
        }

        private static void HandleEcrCancel(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 8080;
            string refId = body.ContainsKey("referenceId") ? Convert.ToString(body["referenceId"]) : "";

            try
            {
                string targetUrl = string.Format("http://{0}:{1}/cancel", ip, port);
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(targetUrl);
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Timeout = 10000;

                byte[] postBytes = Encoding.UTF8.GetBytes(Serializer.Serialize(new Dictionary<string, object> { { "referenceId", refId } }));
                req.ContentLength = postBytes.Length;
                using (Stream stream = req.GetRequestStream())
                {
                    stream.Write(postBytes, 0, postBytes.Length);
                }

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    BroadcastSse("ecr_cancelled", new Dictionary<string, object> { { "referenceId", refId } });
                    SendJson(context, 200, new Dictionary<string, object> { { "success", true } });
                }
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", ex.Message } });
            }
        }

        private static void HandleEcrTest(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 8080;

            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                using (TcpClient tcp = new TcpClient())
                {
                    var result = tcp.BeginConnect(ip, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(3000);
                    sw.Stop();
                    if (success)
                    {
                        tcp.EndConnect(result);
                        SendJson(context, 200, new Dictionary<string, object>
                        {
                            { "success", true },
                            { "data", new Dictionary<string, object> {
                                { "online", true },
                                { "reachable", true },
                                { "portOpen", true },
                                { "pingSucceeded", true },
                                { "message", "الاتصال بماكينة الدفع نشط ومستعد" },
                                { "latencyMs", sw.ElapsedMilliseconds }
                            }}
                        });
                        return;
                    }
                }
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", "انتهت مهلة الاتصال بالماكينة" } });
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", ex.Message } });
            }
        }

        private static void SendRawPrinterBytes(string ip, int port, byte[] bytes)
        {
            using (TcpClient client = new TcpClient())
            {
                var ar = client.BeginConnect(ip, port, null, null);
                if (!ar.AsyncWaitHandle.WaitOne(5000))
                {
                    throw new Exception(string.Format("انتهت مهلة الاتصال بالطابعة على {0}:{1}", ip, port));
                }
                client.EndConnect(ar);
                using (NetworkStream stream = client.GetStream())
                {
                    stream.Write(bytes, 0, bytes.Length);
                    stream.Flush();
                    Thread.Sleep(100);
                }
            }
        }

        private static void HandlePrinterPrint(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 9100;
            string rawBase64 = body.ContainsKey("rawBase64") ? Convert.ToString(body["rawBase64"]) : "";
            string rawText = body.ContainsKey("rawText") ? Convert.ToString(body["rawText"]) : "";

            if (string.IsNullOrEmpty(ip))
            {
                SendJson(context, 400, new Dictionary<string, object> { { "success", false }, { "error", "يرجى تحديد عنوان IP الطابعة" } });
                return;
            }

            try
            {
                List<byte> buffer = new List<byte>();
                buffer.AddRange(new byte[] { 0x1B, 0x40 });

                if (!string.IsNullOrEmpty(rawBase64))
                {
                    buffer.AddRange(Convert.FromBase64String(rawBase64));
                }
                else if (!string.IsNullOrEmpty(rawText))
                {
                    buffer.AddRange(Encoding.UTF8.GetBytes(rawText));
                }

                buffer.AddRange(Encoding.UTF8.GetBytes("\n\n\n\n"));
                buffer.AddRange(new byte[] { 0x1D, 0x56, 0x42, 0x00 });

                SendRawPrinterBytes(ip, port, buffer.ToArray());
                SendJson(context, 200, new Dictionary<string, object> { { "success", true }, { "bytesWritten", buffer.Count } });
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", ex.Message } });
            }
        }

        private static void HandlePrinterTest(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 9100;
            string storeName = body.ContainsKey("storeName") ? Convert.ToString(body["storeName"]) : "Z-Systems Store";

            if (string.IsNullOrEmpty(ip))
            {
                SendJson(context, 400, new Dictionary<string, object> { { "success", false }, { "error", "يرجى تحديد عنوان IP الطابعة" } });
                return;
            }

            try
            {
                List<byte> buffer = new List<byte>();
                buffer.AddRange(new byte[] { 0x1B, 0x40 });
                buffer.AddRange(new byte[] { 0x1B, 0x61, 0x01 });
                buffer.AddRange(Encoding.UTF8.GetBytes("\n=== " + storeName + " ===\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Z-Systems Hardware Bridge\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Silent ESC/POS Test OK\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("--------------------------------\n"));
                buffer.AddRange(new byte[] { 0x1B, 0x61, 0x00 });
                buffer.AddRange(Encoding.UTF8.GetBytes("Status: Online & Ready\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Port: 9100 Raw Stream\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Date: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("--------------------------------\n\n\n\n"));
                buffer.AddRange(new byte[] { 0x1D, 0x56, 0x42, 0x00 });

                SendRawPrinterBytes(ip, port, buffer.ToArray());
                SendJson(context, 200, new Dictionary<string, object> { { "success", true } });
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", ex.Message } });
            }
        }

        private static void HandleKickDrawer(HttpListenerContext context, Dictionary<string, object> body)
        {
            string ip = body.ContainsKey("ip") ? Convert.ToString(body["ip"]) : "";
            int port = body.ContainsKey("port") ? Convert.ToInt32(body["port"]) : 9100;

            if (string.IsNullOrEmpty(ip))
            {
                SendJson(context, 400, new Dictionary<string, object> { { "success", false }, { "error", "يرجى تحديد عنوان IP الطابعة" } });
                return;
            }

            try
            {
                byte[] drawerCmd = new byte[] { 0x1B, 0x40, 0x1B, 0x70, 0x00, 0x19, 0xFA };
                SendRawPrinterBytes(ip, port, drawerCmd);
                SendJson(context, 200, new Dictionary<string, object> { { "success", true } });
            }
            catch (Exception ex)
            {
                SendJson(context, 500, new Dictionary<string, object> { { "success", false }, { "error", ex.Message } });
            }
        }
    }
}
