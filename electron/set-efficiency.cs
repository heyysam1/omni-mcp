using System;
using System.Runtime.InteropServices;

namespace OmniMcp {
    class Program {
        [StructLayout(LayoutKind.Sequential)]
        public struct PROCESS_POWER_THROTTLING_STATE {
            public uint Version;
            public uint ControlMask;
            public uint StateMask;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool SetProcessInformation(
            IntPtr hProcess,
            int ProcessInformationClass,
            ref PROCESS_POWER_THROTTLING_STATE ProcessInformation,
            uint ProcessInformationSize
        );

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool SetPriorityClass(IntPtr hProcess, uint dwPriorityClass);

        [DllImport("kernel32.dll")]
        public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

        [DllImport("kernel32.dll")]
        public static extern bool CloseHandle(IntPtr hObject);

        public const int ProcessPowerThrottling = 4;
        public const uint PROCESS_POWER_THROTTLING_CURRENT_VERSION = 1;
        public const uint PROCESS_POWER_THROTTLING_EXECUTION_SPEED = 0x1;
        public const uint IDLE_PRIORITY_CLASS = 0x00000040;
        public const uint PROCESS_SET_INFORMATION = 0x0200;

        static void Main(string[] args) {
            foreach (string arg in args) {
                string[] parts = arg.Split(new char[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string s in parts) {
                    int pid;
                    if (int.TryParse(s.Trim(), out pid)) {
                        ApplyEfficiency(pid);
                    }
                }
            }
        }

        static void ApplyEfficiency(int pid) {
            IntPtr h = OpenProcess(PROCESS_SET_INFORMATION, false, pid);
            if (h == IntPtr.Zero) return;
            try {
                SetPriorityClass(h, IDLE_PRIORITY_CLASS);
                PROCESS_POWER_THROTTLING_STATE st = new PROCESS_POWER_THROTTLING_STATE();
                st.Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION;
                st.ControlMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED;
                st.StateMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED;
                SetProcessInformation(h, ProcessPowerThrottling, ref st, (uint)Marshal.SizeOf(st));
            } catch {}
            finally {
                CloseHandle(h);
            }
        }
    }
}
