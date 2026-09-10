using System;
using System.IO;
using System.Net;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography.Pkcs;
using System.Web.Script.Serialization;

namespace ZsEtaSigner
{
    class Program
    {
        private const int Port = 8585;
        private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.Title = "ZS Local ETA Signer Bridge - v1.0.0";

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("       ZS Local ETA USB Token Signer Bridge (Windows Microservice)");
            Console.WriteLine("       Egyptian Tax Authority (ETA) e-Invoicing Digital Signer");
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
                Console.WriteLine("Try running the application as Administrator or check if port is in use.");
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[ONLINE] Signer Service listening on http://127.0.0.1:{0}/", Port);
            Console.WriteLine("[READY] Waiting for requests from Z-Systems ERP Web App...");
            Console.ResetColor();

            // Scan tokens at startup
            ScanAndReportTokens();

            while (true)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    System.Threading.ThreadPool.QueueUserWorkItem(state => ProcessRequest((HttpListenerContext)state), context);
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("[WARN] Listener error: {0}", ex.Message);
                    Console.ResetColor();
                }
            }
        }

        private static void ScanAndReportTokens()
        {
            try
            {
                List<Dictionary<string, object>> certs = GetEligibleCertificates();
                if (certs.Count > 0)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("[INFO] Detected {0} digital certificate(s):", certs.Count);
                    foreach (var c in certs)
                    {
                        Console.WriteLine("   - Subject: {0} | Issuer: {1} (Expires: {2})", c["subject"], c["issuer"], c["validTo"]);
                    }
                    Console.ResetColor();
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("[INFO] No USB Token / Smartcard certificates detected yet. Please plug in your USB Token.");
                    Console.ResetColor();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not scan certificates: {0}", ex.Message);
            }
        }

        private static void ProcessRequest(HttpListenerContext context)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            // Global CORS headers
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
            response.Headers.Add("Access-Control-Max-Age", "86400");

            if (request.HttpMethod.ToUpperInvariant() == "OPTIONS")
            {
                response.StatusCode = 204;
                response.Close();
                return;
            }

            string path = request.Url.AbsolutePath.TrimEnd('/').ToLowerInvariant();
            if (string.IsNullOrEmpty(path)) path = "/health";

            try
            {
                if (request.HttpMethod.ToUpperInvariant() == "GET" && path == "/health")
                {
                    HandleHealth(response);
                }
                else if (request.HttpMethod.ToUpperInvariant() == "GET" && path == "/certificates")
                {
                    HandleGetCertificates(response);
                }
                else if (request.HttpMethod.ToUpperInvariant() == "POST" && path == "/sign")
                {
                    HandleSign(request, response);
                }
                else
                {
                    SendJsonResponse(response, 404, new Dictionary<string, object>
                    {
                        { "status", "error" },
                        { "message", "Endpoint not found" }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Request failed: {0}", ex.Message);
                Console.ResetColor();

                SendJsonResponse(response, 500, new Dictionary<string, object>
                {
                    { "status", "error" },
                    { "message", ex.Message }
                });
            }
        }

        private static void HandleHealth(HttpListenerResponse response)
        {
            List<Dictionary<string, object>> certs = GetEligibleCertificates();
            bool tokenDetected = certs.Count > 0;

            var result = new Dictionary<string, object>
            {
                { "status", "online" },
                { "service", "ZS Local ETA Signer Bridge" },
                { "version", "1.0.0" },
                { "port", Port },
                { "tokenDetected", tokenDetected },
                { "certificateCount", certs.Count },
                { "certificates", certs },
                { "timestamp", DateTime.UtcNow.ToString("o") }
            };

            SendJsonResponse(response, 200, result);
        }

        private static void HandleGetCertificates(HttpListenerResponse response)
        {
            List<Dictionary<string, object>> certs = GetEligibleCertificates();

            var result = new Dictionary<string, object>
            {
                { "status", "success" },
                { "count", certs.Count },
                { "certificates", certs }
            };

            SendJsonResponse(response, 200, result);
        }

        private static void HandleSign(HttpListenerRequest request, HttpListenerResponse response)
        {
            string requestBody;
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                requestBody = reader.ReadToEnd();
            }

            var payload = Serializer.Deserialize<Dictionary<string, object>>(requestBody);
            if (payload == null)
            {
                SendJsonResponse(response, 400, new Dictionary<string, object>
                {
                    { "status", "error" },
                    { "message", "Invalid JSON payload" }
                });
                return;
            }

            string canonicalHash = payload.ContainsKey("canonicalHash") ? Convert.ToString(payload["canonicalHash"]) : null;
            string canonicalJson = payload.ContainsKey("canonicalJson") ? Convert.ToString(payload["canonicalJson"]) : null;
            string pin = payload.ContainsKey("pin") ? Convert.ToString(payload["pin"]) : null;
            string targetSerial = payload.ContainsKey("certificateSerialNumber") ? Convert.ToString(payload["certificateSerialNumber"]) : null;

            if (string.IsNullOrEmpty(canonicalHash) && string.IsNullOrEmpty(canonicalJson))
            {
                SendJsonResponse(response, 400, new Dictionary<string, object>
                {
                    { "status", "error" },
                    { "message", "Either canonicalHash or canonicalJson is required" }
                });
                return;
            }

            // Find best signing certificate
            X509Certificate2 cert = SelectSigningCertificate(targetSerial, pin);
            if (cert == null)
            {
                SendJsonResponse(response, 400, new Dictionary<string, object>
                {
                    { "status", "error" },
                    { "message", "No valid USB Token certificate found with a private key. Ensure token is inserted." }
                });
                return;
            }

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("[SIGN] Signing document with certificate: {0} (SN: {1})", cert.Subject, cert.SerialNumber);
            Console.ResetColor();

            // Prepare payload bytes
            byte[] dataToSign;
            if (!string.IsNullOrEmpty(canonicalJson))
            {
                dataToSign = Encoding.UTF8.GetBytes(canonicalJson);
            }
            else
            {
                // Sign the canonical hash representation
                dataToSign = Encoding.UTF8.GetBytes(canonicalHash);
            }

            // Generate CAdES-BES Detached Signature using RFC 5652 PKCS#7 / SignedCms
            ContentInfo contentInfo = new ContentInfo(dataToSign);
            SignedCms signedCms = new SignedCms(contentInfo, true); // true = detached signature

            CmsSigner signer = new CmsSigner(cert);
            signer.DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"); // SHA-256
            signer.IncludeOption = X509IncludeOption.EndCertOnly;

            // Add CAdES-BES SigningTime attribute
            signer.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.UtcNow));

            // Compute signature (Windows CSP will prompt for token PIN if not cached or verify key)
            signedCms.ComputeSignature(signer, false);

            byte[] encodedSignature = signedCms.Encode();
            string cadesSignatureBase64 = Convert.ToBase64String(encodedSignature);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[SUCCESS] Document successfully signed (CAdES-BES size: {0} bytes)", encodedSignature.Length);
            Console.ResetColor();

            var result = new Dictionary<string, object>
            {
                { "status", "success" },
                { "cadesSignature", cadesSignatureBase64 },
                { "certificateSerialNumber", cert.SerialNumber },
                { "subject", cert.Subject },
                { "issuer", cert.Issuer },
                { "signedAt", DateTime.UtcNow.ToString("o") }
            };

            SendJsonResponse(response, 200, result);
        }

        private static List<Dictionary<string, object>> GetEligibleCertificates()
        {
            var list = new List<Dictionary<string, object>>();

            X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            try
            {
                store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);
                foreach (X509Certificate2 cert in store.Certificates)
                {
                    if (!cert.HasPrivateKey) continue;

                    bool isEgyptToken = (cert.Issuer.IndexOf("Egypt Trust", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         cert.Issuer.IndexOf("Misr", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         cert.Issuer.IndexOf("MCDR", StringComparison.OrdinalIgnoreCase) >= 0);

                    // Check if still valid
                    bool isValidNow = DateTime.Now >= cert.NotBefore && DateTime.Now <= cert.NotAfter;

                    var item = new Dictionary<string, object>
                    {
                        { "subject", cert.GetNameInfo(X509NameType.SimpleName, false) ?? cert.Subject },
                        { "fullSubject", cert.Subject },
                        { "issuer", cert.GetNameInfo(X509NameType.SimpleName, true) ?? cert.Issuer },
                        { "serialNumber", cert.SerialNumber },
                        { "thumbprint", cert.Thumbprint },
                        { "validFrom", cert.NotBefore.ToString("yyyy-MM-dd") },
                        { "validTo", cert.NotAfter.ToString("yyyy-MM-dd") },
                        { "isValid", isValidNow },
                        { "isHardwareToken", isEgyptToken || cert.HasPrivateKey },
                        { "hasPrivateKey", true }
                    };
                    list.Add(item);
                }
            }
            finally
            {
                store.Close();
            }

            return list;
        }

        private static X509Certificate2 SelectSigningCertificate(string preferredSerialNumber, string pin)
        {
            X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            try
            {
                store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

                // 1. If preferred serial is specified
                if (!string.IsNullOrEmpty(preferredSerialNumber))
                {
                    foreach (X509Certificate2 cert in store.Certificates)
                    {
                        if (cert.HasPrivateKey && cert.SerialNumber.Equals(preferredSerialNumber, StringComparison.OrdinalIgnoreCase))
                        {
                            return ConfigureCertPin(cert, pin);
                        }
                    }
                }

                // 2. Prioritize Egypt Trust / Misr Clearing tokens
                foreach (X509Certificate2 cert in store.Certificates)
                {
                    if (cert.HasPrivateKey &&
                        (cert.Issuer.IndexOf("Egypt Trust", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         cert.Issuer.IndexOf("Misr", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         cert.Issuer.IndexOf("MCDR", StringComparison.OrdinalIgnoreCase) >= 0))
                    {
                        if (DateTime.Now >= cert.NotBefore && DateTime.Now <= cert.NotAfter)
                        {
                            return ConfigureCertPin(cert, pin);
                        }
                    }
                }

                // 3. Fallback to any valid cert with a private key
                foreach (X509Certificate2 cert in store.Certificates)
                {
                    if (cert.HasPrivateKey && DateTime.Now >= cert.NotBefore && DateTime.Now <= cert.NotAfter)
                    {
                        return ConfigureCertPin(cert, pin);
                    }
                }
            }
            finally
            {
                store.Close();
            }

            return null;
        }

        private static X509Certificate2 ConfigureCertPin(X509Certificate2 cert, string pin)
        {
            if (string.IsNullOrEmpty(pin)) return cert;

            try
            {
                RSACryptoServiceProvider rsaCsp = cert.PrivateKey as RSACryptoServiceProvider;
                if (rsaCsp != null)
                {
                    CspParameters cspParams = new CspParameters(rsaCsp.CspKeyContainerInfo.ProviderType,
                                                                rsaCsp.CspKeyContainerInfo.ProviderName,
                                                                rsaCsp.CspKeyContainerInfo.KeyContainerName);
                    System.Security.SecureString securePin = new System.Security.SecureString();
                    foreach (char c in pin) securePin.AppendChar(c);
                    securePin.MakeReadOnly();

                    cspParams.KeyPassword = securePin;
                    cspParams.Flags = CspProviderFlags.NoPrompt;

                    RSACryptoServiceProvider rsaWithPin = new RSACryptoServiceProvider(cspParams);
                    cert.PrivateKey = rsaWithPin;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not set silent PIN on CSP: {0}. Will use standard Windows prompt.", ex.Message);
            }

            return cert;
        }

        private static void SendJsonResponse(HttpListenerResponse response, int statusCode, object data)
        {
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";

            string json = Serializer.Serialize(data);
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            response.ContentLength64 = bytes.Length;

            using (Stream output = response.OutputStream)
            {
                output.Write(bytes, 0, bytes.Length);
            }
        }
    }
}
