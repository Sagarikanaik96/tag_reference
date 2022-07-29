function initMap() {
    let autocomplete;
    let place;
    let componentForm = {
        street_number: "long_name",
        route: "long_name",
        locality: "long_name",
        administrative_area_level_1: "long_name",
        country: "long_name",
        postal_code: "long_name"
    };


    let default_location = {
        lat: 38.889248,
        lng: -77.050636
    };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: default_location,
        mapTypeControl: false,
    });

    const marker = new google.maps.Marker({
        map,
    });
    const geocoder = new google.maps.Geocoder();

    if (jQuery("#autocomplete-address").length) {
        autocomplete = new google.maps.places.Autocomplete(
            document.getElementById("autocomplete-address"), {
                types: ["geocode"]
            }
        );
        autocomplete.addListener("place_changed", fillInAddress);
    }


    function fillInAddress() {
        place = autocomplete.getPlace();
        if (!place.formatted_address && place.name) {
            let val = parseFloat(place.name);
            if (!isNaN(val) && val <= 90 && val >= -90) {
                let latlng = place.name.split(",");
                default_location = {
                    lat: parseFloat(latlng[0]),
                    lng: parseFloat(latlng[1])
                };
                geocode({
                    location: default_location
                });
            }
        } else {
            make_address(place, "auto",componentForm);
            geocode({
                address: place.formatted_address
            });
        }
    }

    function geocode(request) {
        geocoder.geocode(request).then((result) => {
            const {
                results
            } = result;
            map.setCenter(results[0].geometry.location);
            marker.setPosition(results[0].geometry.location);
            marker.setMap(map);
            return results;
        }).catch((e) => {
            alert("Geocode was not successful for the following reason: " + e);
        });
    }
}
function make_address(value, key, componentForm) {
    let data = {
        name: "",
        street_number: "",
        route: "",
        locality: "",
        administrative_area_level_1: "",
        country: "",
        postal_code: "",
        lat: "",
        lng: "",
        plus_code: ""
    };
    if (key == "auto") {
        data["lat"] = value.geometry.location.lat();
        data["lng"] = value.geometry.location.lng();
        data["name"] = value.formatted_address;
        make(value,key,componentForm,data);
    } else {
        let values = value.results[0] || [];
        data["lat"] = (values ? values.geometry.location.lat() : "");
        data["lng"] = (values ? values.geometry.location.lng() : "");
        data["name"] = value.formatted_address;
         make(value,key,componentForm,data);
    }
    update_address(data)
}
function make(value, _key, componentForm, data) {
    for (let i in value.address_components) {
        let addressType = value.address_components[i].types[0];
        if (componentForm[addressType]) {
            let val = value.address_components[i][componentForm[addressType]];
            let k = value.address_components[i].types[0];
            data[k] = val;
        }
    }

}
function update_address(data){
    let street = data.street_number ? (data.street_number + " " + data.route) : data.route;
    if (cur_frm.doc.doctype == 'Employee') {
        update_basic_value(data)
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "street_address", data.route);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lat", data["lat"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lng", data["lng"]);
    } else if (cur_frm.doc.doctype == 'Company') {
        update_basic_value(data)
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address", street);
    } else if (cur_frm.doc.doctype == 'Lead'){
        update_basic_value(data)
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_1", street);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_2", "");
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_2", (data["street_number"] + " " + data["route"]));
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state_2", data["administrative_area_level_1"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city_or_town", data["locality"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
    } else if (cur_frm.doc.doctype == 'Contact'){
        update_basic_value(data)
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "contact_address", street);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
    }
}

function update_basic_value(data){
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "complete_address", document.getElementById("autocomplete-address").value);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "suite_or_apartment_no", data.street_number);

}
