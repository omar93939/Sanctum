export const formatDateTimeAgo = (inputDate: Date) => {
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - inputDate.getTime();
  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 1) {
    return `${years} years ago`;
  }
  if (years === 1) {
    return `1 year ago`;
  }
  if (months > 1) {
    return `${months} months ago`;
  }
  if (months === 1) {
    return `1 month ago`;
  }
  if (weeks > 1) {
    return `${weeks} weeks ago`;
  }
  if (weeks === 1) {
    return `1 week ago`;
  }
  if (days > 1) {
    return `${days} days ago`;
  }
  if (days === 1) {
    return `1 day ago`;
  }
  if (hours > 1) {
    return `${hours} hours ago`;
  }
  if (hours === 1) {
    return `1 hour ago`;
  }
  if (minutes > 1) {
    return `${minutes} minutes ago`;
  }
  if (minutes === 1) {
    return `1 minute ago`;
  }
  if (seconds > 1) {
    return `${seconds} seconds ago`;
  }
  if (seconds === 1) {
    return `1 second ago`;
  }
  return `Just now`;
}
