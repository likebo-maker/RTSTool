from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk

from license_core import (
    FEATURE_LABELS,
    VALID_FEATURES,
    VALID_VERSIONS,
    generate_license,
    load_records,
    normalize_machine_code,
    save_record,
)


class LicenseGeneratorApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("技术支持效率平台 License Center")
        self.geometry("1080x720")
        self.configure(bg="#061427")
        self.feature_vars: dict[str, tk.BooleanVar] = {}
        self._build_ui()
        self._load_records()

    def _build_ui(self) -> None:
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = tk.Frame(self, bg="#0b1d36", height=72, bd=0, highlightthickness=1, highlightbackground="#114a7a")
        header.grid(row=0, column=0, sticky="ew", padx=14, pady=(12, 8))
        header.grid_propagate(False)
        tk.Label(header, text="技术支持效率平台 License Center", fg="#f3fbff", bg="#0b1d36", font=("Helvetica", 22, "bold")).pack(anchor="w", padx=18, pady=(12, 0))
        tk.Label(header, text="注册码授权工具｜Powered by RTS Team", fg="#81b9e6", bg="#0b1d36", font=("Helvetica", 10)).pack(anchor="w", padx=18)

        body = tk.Frame(self, bg="#061427")
        body.grid(row=1, column=0, sticky="nsew", padx=14, pady=(0, 12))
        body.columnconfigure(0, weight=0)
        body.columnconfigure(1, weight=1)
        body.rowconfigure(0, weight=1)

        left = tk.Frame(body, bg="#0b1d36", highlightthickness=1, highlightbackground="#114a7a")
        left.grid(row=0, column=0, sticky="nsw", padx=(0, 10))
        right = tk.Frame(body, bg="#0b1d36", highlightthickness=1, highlightbackground="#114a7a")
        right.grid(row=0, column=1, sticky="nsew")
        right.rowconfigure(1, weight=1)

        self.machine_var = tk.StringVar()
        self.user_var = tk.StringVar()
        self.department_var = tk.StringVar()
        self.expire_var = tk.StringVar(value="2099-12-31")
        self.version_var = tk.StringVar(value="PRO")

        self._field(left, "机器码", self.machine_var, "例如 8562-5026-FD3B-FCD6")
        self._field(left, "授权人", self.user_var, "张三")
        self._field(left, "部门", self.department_var, "中国区技术支持部")
        self._field(left, "到期日期", self.expire_var, "YYYY-MM-DD")

        version_box = ttk.Combobox(left, textvariable=self.version_var, values=VALID_VERSIONS, state="readonly", width=28)
        self._field_widget(left, "版本", version_box)

        feature_wrap = tk.Frame(left, bg="#0b1d36")
        tk.Label(feature_wrap, text="功能权限", fg="#d9edff", bg="#0b1d36", font=("Helvetica", 11, "bold")).pack(anchor="w", pady=(8, 6))
        for feature in VALID_FEATURES:
          var = tk.BooleanVar(value=True)
          self.feature_vars[feature] = var
          tk.Checkbutton(
              feature_wrap,
              text=FEATURE_LABELS[feature],
              variable=var,
              onvalue=True,
              offvalue=False,
              fg="#d7ebff",
              bg="#0b1d36",
              activebackground="#0b1d36",
              activeforeground="#ffffff",
              selectcolor="#133d63",
              anchor="w",
          ).pack(fill="x", padx=2, pady=2)
        feature_wrap.pack(fill="x", padx=18, pady=(4, 10))

        action_row = tk.Frame(left, bg="#0b1d36")
        action_row.pack(fill="x", padx=18, pady=(0, 14))
        tk.Button(action_row, text="全选权限", command=self._select_all, bg="#163a5f", fg="#eaf7ff", relief="flat").pack(side="left", padx=(0, 8))
        tk.Button(action_row, text="取消全选", command=self._clear_all, bg="#163a5f", fg="#eaf7ff", relief="flat").pack(side="left", padx=(0, 8))
        tk.Button(action_row, text="生成注册码", command=self._generate, bg="#1481ff", fg="#ffffff", relief="flat").pack(side="right")

        tk.Label(right, text="注册码结果", fg="#f3fbff", bg="#0b1d36", font=("Helvetica", 14, "bold")).grid(row=0, column=0, sticky="w", padx=18, pady=(16, 8))
        self.code_text = scrolledtext.ScrolledText(right, wrap="word", bg="#07182c", fg="#f0f7ff", insertbackground="#f0f7ff", relief="flat", height=10)
        self.code_text.grid(row=1, column=0, sticky="nsew", padx=18, pady=(0, 12))
        self.code_text.configure(font=("Consolas", 11))

        bottom = tk.Frame(right, bg="#0b1d36")
        bottom.grid(row=2, column=0, sticky="ew", padx=18, pady=(0, 16))
        tk.Button(bottom, text="复制注册码", command=self._copy_code, bg="#163a5f", fg="#eaf7ff", relief="flat").pack(side="left")

        tk.Label(right, text="授权记录", fg="#f3fbff", bg="#0b1d36", font=("Helvetica", 14, "bold")).grid(row=3, column=0, sticky="w", padx=18, pady=(0, 8))
        self.record_text = scrolledtext.ScrolledText(right, wrap="word", bg="#07182c", fg="#d0e6ff", relief="flat", height=12)
        self.record_text.grid(row=4, column=0, sticky="nsew", padx=18, pady=(0, 18))
        self.record_text.configure(font=("Consolas", 10))

    def _field(self, parent: tk.Widget, label: str, variable: tk.StringVar, placeholder: str) -> None:
        entry = tk.Entry(parent, textvariable=variable, bg="#07182c", fg="#f0f7ff", insertbackground="#f0f7ff", relief="flat", width=34)
        self._field_widget(parent, label, entry, placeholder)

    def _field_widget(self, parent: tk.Widget, label: str, widget: tk.Widget, helper: str = "") -> None:
        block = tk.Frame(parent, bg="#0b1d36")
        block.pack(fill="x", padx=18, pady=(14, 0))
        tk.Label(block, text=label, fg="#d9edff", bg="#0b1d36", font=("Helvetica", 11, "bold")).pack(anchor="w", pady=(0, 4))
        widget.pack(fill="x")
        if helper:
            tk.Label(block, text=helper, fg="#7eaad1", bg="#0b1d36", font=("Helvetica", 9)).pack(anchor="w", pady=(4, 0))

    def _selected_features(self) -> list[str]:
        return [feature for feature, enabled in self.feature_vars.items() if enabled.get()]

    def _select_all(self) -> None:
        for var in self.feature_vars.values():
            var.set(True)

    def _clear_all(self) -> None:
        for var in self.feature_vars.values():
            var.set(False)

    def _generate(self) -> None:
        try:
            code, payload = generate_license(
                machine=normalize_machine_code(self.machine_var.get()),
                user=self.user_var.get(),
                department=self.department_var.get(),
                expire=self.expire_var.get(),
                version=self.version_var.get(),
                features=self._selected_features(),
            )
            save_record(code, payload)
        except Exception as exc:
            messagebox.showerror("生成失败", str(exc))
            return

        self.code_text.delete("1.0", tk.END)
        self.code_text.insert(tk.END, code)
        self._load_records()
        messagebox.showinfo("生成成功", "注册码已生成并保存到授权记录。")

    def _copy_code(self) -> None:
        code = self.code_text.get("1.0", tk.END).strip()
        if not code:
            return
        self.clipboard_clear()
        self.clipboard_append(code)
        self.update()

    def _load_records(self) -> None:
        records = load_records()
        self.record_text.delete("1.0", tk.END)
        if not records:
            self.record_text.insert(tk.END, "暂无授权记录")
            return
        for item in records[-20:][::-1]:
            self.record_text.insert(
                tk.END,
                f"[{item.get('created_at', '-')}] {item.get('license_user', '-')}"
                f" | {item.get('department', '-')}"
                f" | {item.get('machine_code', '-')}"
                f" | {item.get('expire_date', '-')}\n"
            )


if __name__ == "__main__":
    app = LicenseGeneratorApp()
    app.mainloop()
