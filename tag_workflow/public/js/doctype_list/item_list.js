frappe.flags.my_list = [];
frappe.flags.company = "";
frappe.flags.tag_list = "";
frappe.listview_settings["Item"] = {
  hide_name_column: true,
  onload: function (listview) {
    $('[data-fieldname="name"]').attr("placeholder", "Job Title");

    frappe.route_options = {
      company: "",
    };
    const df = {
      condition: "=",
      default: null,
      fieldname: "rate",
      fieldtype: "Autocomplete",
      input_class: "input-xs",
      label: "Rate",
      is_filter: 1,
      onchange: function () {
        listview.refresh();
      },
      placeholder: "Rate",
    };
    listview.page.add_field(df, ".standard-filter-section");
  },
  refresh: function () {
    $('div[data-fieldname="name"]').hide();
    let btn = document.getElementById("filter_selected_data");
    btn.addEventListener("click", function () {
      btn.click();
      btn.style.backgroundColor = "#21B9E4";
      btn.style.color = "#fff";
      let btn3 = document.getElementById("filter_all_data");
      btn3.style.backgroundColor = "White";
      btn3.style.color = "black";
      frappe.call({
        method: "tag_workflow.tag_data.my_used_job_title",
        args: {
          company_name: frappe.boot.tag.tag_user_info.company,
          company_type: frappe.boot.tag.tag_user_info.company_type,
        },
        callback: function (r) {
          if (frappe.boot.tag.tag_user_info.company_type == "TAG") {
            frappe.flags.tag_list = "True";
            frappe.flags.my_list = [];
            frappe.flags.company = "False";
            cur_list.refresh();
          } else {
            frappe.flags.my_list.push("success");
            frappe.flags.company = "False";
            frappe.flags.tag_list = "False";
            cur_list.refresh();
          }
        },
      });
    });
    let btn1 = document.getElementById("filter_all_data");
    btn1.addEventListener("click", function () {
      btn1.click();
      btn1.style.backgroundColor = "#21B9E4";
      btn1.style.color = "#fff";
      let btn2 = document.getElementById("filter_selected_data");
      btn2.style.backgroundColor = "White";
      btn2.style.color = "black";
      frappe.flags.company = "True";
      frappe.flags.my_list = [];
      frappe.flags.tag_list = "False";
      cur_list.refresh();
    });
  },
};
