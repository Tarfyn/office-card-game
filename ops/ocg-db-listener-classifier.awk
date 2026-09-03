function ipv4_loopback(address, octets, count, octet_index) {
  count = split(address, octets, ".")
  if (count != 4 || octets[1] !~ /^[0-9]+$/ || octets[1] + 0 != 127) {
    return 0
  }
  for (octet_index = 2; octet_index <= 4; octet_index++) {
    if (octets[octet_index] !~ /^[0-9]+$/ || octets[octet_index] + 0 > 255) {
      return 0
    }
  }
  return 1
}

function local_address(endpoint, closing_bracket) {
  if (substr(endpoint, 1, 1) == "[") {
    closing_bracket = index(endpoint, "]")
    if (closing_bracket < 3 || substr(endpoint, closing_bracket + 1) != ":5432") {
      return ""
    }
    return substr(endpoint, 2, closing_bracket - 2)
  }
  if (endpoint !~ /:5432$/) {
    return ""
  }
  sub(/:5432$/, "", endpoint)
  return endpoint
}

{
  # ss -H -l -t -n columns are: State Recv-Q Send-Q Local Peer [Process].
  # Only field 4 is the locally bound endpoint. Field 5 is deliberately ignored.
  if (NF < 4) {
    unsafe = 1
    next
  }
  address = local_address($4)
  if (address != "::1" && !ipv4_loopback(address)) {
    unsafe = 1
  }
}

END {
  exit(unsafe ? 0 : 1)
}
