frappe.listview_settings["Timesheet"] = {
  hide_name_column: true,
  add_fields: [
    "status",
    "total_hours",
    "start_date",
    "end_date",
    "from_date",
    "to_date",
  ],
  right_column: "name",

  refresh: function () {
    $("#navbar-breadcrumbs > li > a").html("Timesheets");
    $(".custom-actions.hidden-xs.hidden-md").hide();
    $('[data-original-title="Menu"]').hide();
    $("button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs").hide();
    $(
      ".col.layout-main-section-wrapper, .col-md-12.layout-main-section-wrapper"
    ).css("max-width", "90%");
    $(
      ".editable-form .layout-main-section-wrapper .layout-main-section, .submitted-form .layout-main-section-wrapper .layout-main-section, #page-Company .layout-main-section-wrapper .layout-main-section, #page-Timesheet .layout-main-section-wrapper .layout-main-section, #page-Lead .layout-main-section-wrapper .layout-main-section"
    ).css("max-width", "750px");
    if (cur_list.doctype == "Timesheet") {
      cur_list.page.btn_primary[0].style.display = "none";
    }
    $('[data-original-title="Name"]').hide();
  },

  formatters: {
    total_hours(val, d, f) {
      if (typeof val == "number") {
        val = val.toFixed(2);
      }

      if (val == "") {
        return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" ><a class="filterable ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >0.00</a></span>`;
      } else {
        return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" ><a class="filterable ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" >${val}</a></span>`;
      }
    },
  },

  onload: function (listview) {
    jQuery(document).on("click", ".apply-filters", function () {
      let jo = "";
      $(".link-field")
        .find("input:text")
        .each(function () {
          jo = $(this).val();
        });
      localStorage.setItem("job_order", jo);
    });

    [cur_list.columns[2], cur_list.columns[3]] = [
      cur_list.columns[3],
      cur_list.columns[2],
    ];
    [cur_list.columns[2], cur_list.columns[4]] = [
      cur_list.columns[4],
      cur_list.columns[2],
    ];
    [cur_list.columns[4], cur_list.columns[6]] = [
      cur_list.columns[6],
      cur_list.columns[4],
    ];
    [cur_list.columns[5], cur_list.columns[6]] = [
      cur_list.columns[6],
      cur_list.columns[5],
    ];

    cur_list.render_header(cur_list);

    $('h3[title = "Timesheet"]').html("Timesheets");
    if (cur_list.doctype == "Timesheet") {
      cur_list.page.btn_primary[0].style.display = "none";
    }

    if (frappe.session.user != "Administrator") {
      $(".custom-actions.hidden-xs.hidden-md").hide();
      $('[data-original-title="Refresh"]').hide();
      $(".menu-btn-group").hide();
    }

    if (
      (frappe.boot.tag.tag_user_info.company_type == "Hiring" &&
        frappe.boot.tag.tag_user_info.company) ||
      (frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring" &&
        frappe.boot.tag.tag_user_info.company)
    ) {
      listview.page
        .set_secondary_action(
          '<svg class="icon icon-xs" style=""><use class="" href="#icon-add"></use></svg>Add Timesheet',
          function () {
            update_job_order(listview);
          }
        )
        .addClass("btn-primary");
    }
    add_filters(listview);
  },
};

/*-------------------------------*/
function update_job_order(listview) {
  let flt = listview.filters || [];
  for (let f in flt) {
    if (flt[f][1] == "job_order_detail") {
      frappe.route_options = { job_order_detail: flt[f][3] };
    }

    if (flt[f][1] == "job_order") {
      frappe.route_options = { job_order_detail: flt[f][3] };
    }
  }
  frappe.set_route("form", "add-timesheet");
}

function add_filters(listview) {
  const df1 = {
    condition: "like",
    default: null,
    fieldname: "employee_name",
    fieldtype: "Data",
    input_class: "input-xs",
    label: "Employee Name",
    is_filter: 1,
    onchange: function () {
      listview.refresh();
    },
    placeholder: "Employee Name",
  };
  const df2 = {
    condition: "like",
    default: null,
    fieldname: "employee_company",
    fieldtype: "Data",
    input_class: "input-xs",
    label: "Staffing Company",
    is_filter: 1,
    onchange: function () {
      listview.refresh();
    },
    placeholder: "Staffing Company",
  };
  const df3 = {
    condition: "=",
    default: null,
    fieldname: "workflow_state",
    fieldtype: "Select",
    input_class: "input-xs",
    label: "Status",
    is_filter: 1,
    onchange: function () {
      listview.refresh();
    },
    options: ["Open", "Approval Request", "Approved", "Denied"],
    placeholder: "Status",
  };
  let standard_filters_wrapper = listview.page.page_form.find(
    ".standard-filter-section"
  );
  if (frappe.boot.tag.tag_user_info.company_type != "Staffing") {
    listview.page.add_field(df2, standard_filters_wrapper);
  } else {
    listview.columns.splice(6, 1);
    listview.render_header(listview.columns[6]);
    listview.refresh();
    $(".frappe-card").attr("id", "staffing_timesheet");
  }
  listview.page.add_field(df1, standard_filters_wrapper);
  listview.page.add_field(df3, standard_filters_wrapper);
  let doc_filter = document.querySelector(
    'select[data-fieldname = "workflow_state"]'
  );
  doc_filter.options.add(new Option(), 0);
}
