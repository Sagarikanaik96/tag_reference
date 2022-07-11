/*------------ override baselist view -------------*/
frappe.provide("views");

/*------------------preparing data---------------*/
frappe.views.BaseList.prototype.prepare_data = function(r){
    let data = r.message || {};
    data = !Array.isArray(data) ? frappe.utils.dict(data.keys, data.values) : data;
    if (this.start === 0) {
        this.data = data;
    }else{
        if(this.radius === "All" && this.len === 0){
            this.data = this.data.concat(data);
        }else{
            this.data = data;
            this.len = this.start;
        }
    }
}


/*--------------updating args----------------*/
frappe.views.BaseList.prototype.get_call_args = function() {
    this.method = "tag_workflow.utils.reportview.get";
    let args = this.get_args();
    args.radius = this.radius;
    
    return {
        method: this.method,
        args: args,
        freeze: this.freeze_on_refresh || false,
        freeze_message: this.freeze_message || __("Loading") + "...",
    };
}

/*-------------------added buttons--------------------*/
frappe.views.BaseList.prototype.setup_paging_area = function() {
    const paging_values = [20, 100, 500];
    const radius = [5, 10, 25, 50, 100, "Custom Address", "Clear"];
    this.order_location = [];
    this.radius = 'All';
    this.len = 0;
    this.selected_page_count = 20;

    this.$paging_area = $(`
        <div class="list-paging-area level">
            <div class="level-left">
                <div class="btn-group">${paging_values.map((value) => `<button type="button" class="btn btn-default btn-sm btn-paging" data-value="${value}">${value}</button>`).join("")}</div>
            </div>
            <div class="level-right"><button class="btn btn-default btn-more btn-sm">${__("Load More")}</button></div>
        </div>`).hide();

    if(this.doctype == "Job Order" && frappe.boot.tag.tag_user_info.company_type == "Staffing"){
        this.order_location = get_order_location();
        this.$paging_area = $(`
            <div class="list-paging-area level">
                <div class="level-left">
                    <div class="btn-group">${paging_values.map((value) => `<button type="button" class="btn btn-default btn-sm btn-paging" data-value="${value}">${value}</button>`).join("")}</div>
                </div>
                <div class="level-right">${radius.map((value) => `
                    <button class="btn btn-default btn-radius btn-sm" data-value="${value}" style="margin-right: 5px;">${value}</button>`).join("")}
                    <button class="btn btn-default btn-more btn-sm">${__("Load More")}</button>
                </div>
            </div>`).hide();
    }

    this.$frappe_list.append(this.$paging_area);

    // set default paging btn active
    this.$paging_area.find(`.btn-paging[data-value="${this.page_length}"]`).addClass("btn-info");

    // order location(s)

    this.$paging_area.on("click", ".btn-paging, .btn-more, .btn-radius", (e) => {
        const $this = $(e.currentTarget);
        if($this.is(".btn-paging")){
            // set active button
            this.$paging_area.find(".btn-paging").removeClass("btn-info");
            $this.addClass("btn-info");
            this.start = 0;
            this.page_length = this.selected_page_count = $this.data().value;
            this.refresh();
        }else if($this.is(".btn-more")){
            this.start = this.start + this.page_length;
            this.page_length = this.selected_page_count;
            
            $(".btn.btn-default.btn-radius.btn-sm.active").removeClass("active");
            $this.addClass("active");
            this.refresh();
        }else if($this.is(".btn-radius")){
            let val = $this.data().value;
            $(".btn.btn-default.btn-radius.btn-sm.active").removeClass("active");
            $(".btn.btn-default.btn-more.btn-sm.active").removeClass("active");
            $this.addClass("active");
            
            if(!["Custom Address", "Clear"].includes(val)){
                this.radius = $this.data().value;
                this.page_length = 100;
                this.refresh();
            }else if(val == "Custom Address"){
                this.add_fields = [{label: 'Address', fieldname: 'address', fieldtype: 'Select', options: this.order_location, 'reqd': 1}];
                let dialog = new frappe.ui.Dialog({
                    title: 'Please Select an Address',
                    fields: this.add_fields,
                });
                dialog.show();
                dialog.set_primary_action(__('Submit'), function() {
                    let values = dialog.get_values();
                    cur_list.start = 0;
                    cur_list.page_length = 500;
                    cur_list.radius = values.address;
                    cur_list.refresh();
                    dialog.hide();
                });
            }else{
                if(this.radius != "All"){
                    this.len = 0;
                    this.page_length = 20;
                    this.radius = "All";
                    this.refresh();
                }
            }
        }
    });
 }


/*-----------------------order location(s)-------------------------*/
function get_order_location(){
    let order_location = "";
    frappe.call({
        "method": "tag_workflow.utils.reportview.get_location",
        "async": 0,
        "callback": function(r){
            let data = r.message;
            order_location = data.join("\n");
        }
    });
    return order_location;
}
