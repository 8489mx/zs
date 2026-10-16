using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Web.Script.Serialization;

namespace ZSystems.HardwareBridge
{
    class Program
    {
        private const int Port = 18181;
        private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
        private static readonly DateTime StartTime = DateTime.UtcNow;
        private static readonly List<HttpListenerResponse> SseClients = new List<HttpListenerResponse>();
        private static readonly object SseLock = new object();

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.Title = "Z-Systems Hardware Bridge v1.0.0";

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("       Z-Systems Hardware Bridge (Native Windows Service)");
            Console.WriteLine("       Smart POS (ECR), ESC/POS Thermal Printers & Cash Drawers");
            Console.WriteLine("==================================================================");
            Console.ResetColor();

            HttpListener listener = new HttpListener();
            try
            {
                listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", Port));
                listener.Prefixes.Add(string.Format("http://localhost:{0}/", Port));
                listener.Start();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Failed to bind HTTP port {0}: {1}", Port, ex.Message);
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[ONLINE] Hardware Bridge listening on http://127.0.0.1:{0}/", Port);
            Console.WriteLine("[READY] Diagnostics UI: http://127.0.0.1:{0}/diagnostics", Port);
            Console.WriteLine("[ACTIVE] Waiting for Cloud Web POS requests...");
            Console.ResetColor();

            while (true)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[LISTENER ERROR] {0}", ex.Message);
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
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Private-Network", "true");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, x-pairing-key, X-Requested-With");
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
                        { "runtime", "Windows Native .NET" },
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
                    context.Response.Headers.Add("Cache-Control", "no-cache");
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
                // Call terminal HTTP / POSLink
                string targetUrl = string.Format("http://{0}:{1}/poslink", ip, port);
                if (provider.Contains("geidea"))
                {
                    targetUrl = string.Format("http://{0}:{1}/api/v1/payment", ip, port);
                }

                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(targetUrl);
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Timeout = 120000; // 2 minutes for customer card entry

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
                            { "data", new Dictionary<string, object> { { "online", true }, { "latencyMs", sw.ElapsedMilliseconds } } }
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
                buffer.AddRange(new byte[] { 0x1B, 0x40 }); // ESC @ (Init)

                if (!string.IsNullOrEmpty(rawBase64))
                {
                    buffer.AddRange(Convert.FromBase64String(rawBase64));
                }
                else if (!string.IsNullOrEmpty(rawText))
                {
                    buffer.AddRange(Encoding.UTF8.GetBytes(rawText));
                }

                buffer.AddRange(Encoding.UTF8.GetBytes("\n\n\n\n"));
                buffer.AddRange(new byte[] { 0x1D, 0x56, 0x42, 0x00 }); // GS V B 0 (Cut)

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
                buffer.AddRange(new byte[] { 0x1B, 0x40 }); // Init
                buffer.AddRange(new byte[] { 0x1B, 0x61, 0x01 }); // Center
                buffer.AddRange(Encoding.UTF8.GetBytes("\n=== " + storeName + " ===\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Z-Systems Hardware Bridge\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Silent ESC/POS Test OK\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("--------------------------------\n"));
                buffer.AddRange(new byte[] { 0x1B, 0x61, 0x00 }); // Left
                buffer.AddRange(Encoding.UTF8.GetBytes("Status: Online & Ready\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Port: 9100 Raw Stream\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("Date: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "\n"));
                buffer.AddRange(Encoding.UTF8.GetBytes("--------------------------------\n\n\n\n"));
                buffer.AddRange(new byte[] { 0x1D, 0x56, 0x42, 0x00 }); // Cut

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
