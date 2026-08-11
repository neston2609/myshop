"use client";

import { useMemo, useState } from "react";
import thaiAddresses from "@/data/thai-addresses.json";

type SavedAddress = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingSubdistrict: string;
  shippingDistrict: string;
  shippingProvince: string;
  shippingPostalCode: string;
};

type AddressRow = {
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

type ThaiAddressTuple = [string, string, string, string];

const BANGKOK = "กรุงเทพมหานคร";
const addressRows: AddressRow[] = (thaiAddresses as ThaiAddressTuple[]).map(([subdistrict, district, province, postalCode]) => ({
  subdistrict,
  district,
  province,
  postalCode,
}));

function uniqueSorted(values: string[], bangkokFirst = false) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
  if (!bangkokFirst) return uniqueValues;
  return [...uniqueValues.filter((value) => value === BANGKOK), ...uniqueValues.filter((value) => value !== BANGKOK)];
}

function Label({ text, children, className = "" }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1.5 text-sm font-semibold text-slate-800 ${className}`}>
      <span>{text}</span>
      {children}
    </label>
  );
}

const inputClass = "h-11 rounded-md border border-black/10 bg-white px-3 text-base outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15";
const textareaClass = "min-h-28 rounded-md border border-black/10 bg-white px-3 py-3 text-base outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15";

export function ThaiAddressFields({ savedAddress, onPostalCodeChange }: { savedAddress: SavedAddress; onPostalCodeChange?: (postalCode: string) => void }) {
  const [province, setProvince] = useState(savedAddress.shippingProvince);
  const [district, setDistrict] = useState(savedAddress.shippingDistrict);
  const [subdistrict, setSubdistrict] = useState(savedAddress.shippingSubdistrict);
  const [postalCode, setPostalCode] = useState(savedAddress.shippingPostalCode);

  const postalCandidates = useMemo(
    () => (postalCode.length === 5 ? addressRows.filter((row) => row.postalCode === postalCode) : []),
    [postalCode],
  );

  const provinceOptions = useMemo(() => {
    const source = postalCandidates.length > 0 ? postalCandidates : addressRows;
    return uniqueSorted(source.map((row) => row.province), true);
  }, [postalCandidates]);

  const districtOptions = useMemo(() => {
    const source = postalCandidates.length > 0 ? postalCandidates : addressRows;
    return uniqueSorted(source.filter((row) => !province || row.province === province).map((row) => row.district));
  }, [postalCandidates, province]);

  const subdistrictOptions = useMemo(() => {
    const source = postalCandidates.length > 0 ? postalCandidates : addressRows;
    return uniqueSorted(
      source
        .filter((row) => !province || row.province === province)
        .filter((row) => !district || row.district === district)
        .map((row) => row.subdistrict),
    );
  }, [district, postalCandidates, province]);

  function setPostalFromSelection(nextProvince: string, nextDistrict: string, nextSubdistrict: string) {
    const matches = addressRows.filter(
      (row) => row.province === nextProvince && row.district === nextDistrict && row.subdistrict === nextSubdistrict,
    );
    const zipcodes = uniqueSorted(matches.map((row) => row.postalCode));
    if (zipcodes.length === 1) {
      setPostalCode(zipcodes[0]);
      onPostalCodeChange?.(zipcodes[0]);
    }
  }

  function handlePostalChange(value: string) {
    const nextPostalCode = value.replace(/\D/g, "").slice(0, 5);
    setPostalCode(nextPostalCode);
    onPostalCodeChange?.(nextPostalCode);
    if (nextPostalCode.length !== 5) return;

    const matches = addressRows.filter((row) => row.postalCode === nextPostalCode);
    const provinces = uniqueSorted(matches.map((row) => row.province), true);
    const nextProvince = provinces.length === 1 ? provinces[0] : province;
    if (provinces.length === 1) setProvince(nextProvince);

    const provinceMatches = matches.filter((row) => !nextProvince || row.province === nextProvince);
    const districts = uniqueSorted(provinceMatches.map((row) => row.district));
    const nextDistrict = districts.length === 1 ? districts[0] : district;
    if (districts.length === 1) setDistrict(nextDistrict);

    const districtMatches = provinceMatches.filter((row) => !nextDistrict || row.district === nextDistrict);
    const subdistricts = uniqueSorted(districtMatches.map((row) => row.subdistrict));
    if (subdistricts.length === 1) setSubdistrict(subdistricts[0]);
  }

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince);
    setDistrict("");
    setSubdistrict("");
    if (postalCode && !addressRows.some((row) => row.postalCode === postalCode && row.province === nextProvince)) {
      setPostalCode("");
      onPostalCodeChange?.("");
    }
  }

  function handleDistrictChange(nextDistrict: string) {
    setDistrict(nextDistrict);
    setSubdistrict("");
    const matches = addressRows.filter((row) => row.province === province && row.district === nextDistrict);
    const zipcodes = uniqueSorted(matches.map((row) => row.postalCode));
    const nextPostalCode = zipcodes.length === 1 ? zipcodes[0] : "";
    setPostalCode(nextPostalCode);
    onPostalCodeChange?.(nextPostalCode);
  }

  function handleSubdistrictChange(nextSubdistrict: string) {
    setSubdistrict(nextSubdistrict);
    setPostalFromSelection(province, district, nextSubdistrict);
  }

  return (
    <>
      <Label text="ชื่อ">
        <input name="customerName" defaultValue={savedAddress.customerName} required className={inputClass} />
      </Label>
      <Label text="Email">
        <input name="customerEmail" type="email" defaultValue={savedAddress.customerEmail} required className={inputClass} />
      </Label>
      <Label text="ที่อยู่" className="sm:col-span-2">
        <textarea name="shippingAddress" defaultValue={savedAddress.shippingAddress} required className={textareaClass} />
      </Label>
      <Label text="จังหวัด">
        <select name="shippingProvince" value={province} onChange={(event) => handleProvinceChange(event.target.value)} required className={inputClass}>
          <option value="" disabled>เลือกจังหวัด</option>
          {provinceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Label>
      <Label text="อำเภอ / เขต">
        <select name="shippingDistrict" value={district} onChange={(event) => handleDistrictChange(event.target.value)} required disabled={!province && postalCandidates.length === 0} className={inputClass}>
          <option value="" disabled>เลือกอำเภอ / เขต</option>
          {districtOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Label>
      <Label text="ตำบล / แขวง">
        <select name="shippingSubdistrict" value={subdistrict} onChange={(event) => handleSubdistrictChange(event.target.value)} required disabled={!district && postalCandidates.length === 0} className={inputClass}>
          <option value="" disabled>เลือกตำบล / แขวง</option>
          {subdistrictOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Label>
      <Label text="เลขไปรษณีย์">
        <input name="shippingPostalCode" inputMode="numeric" value={postalCode} onChange={(event) => handlePostalChange(event.target.value)} required className={inputClass} />
      </Label>
      <Label text="เบอร์โทร">
        <input name="customerPhone" defaultValue={savedAddress.customerPhone} required className={inputClass} />
      </Label>
      {postalCode.length === 5 && postalCandidates.length > 1 && !subdistrict ? (
        <p className="rounded-md bg-[#0f766e]/10 px-3 py-2 text-sm text-[#0f766e] sm:col-span-2">
          พบหลายตำบลสำหรับรหัสไปรษณีย์นี้ เลือกจังหวัด อำเภอ และตำบลเพื่อเติมข้อมูลให้ตรงที่สุด
        </p>
      ) : null}
      {postalCode.length === 5 && postalCandidates.length === 0 ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          ไม่พบรหัสไปรษณีย์นี้ในฐานข้อมูล กรุณาตรวจสอบอีกครั้ง
        </p>
      ) : null}
    </>
  );
}
