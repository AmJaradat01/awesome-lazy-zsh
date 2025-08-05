class AwesomeLazyZsh < Formula
  desc "Comprehensive Zsh environment manager with plugins, themes, and profiles"
  homepage "https://github.com/AmJaradat01/awesome-lazy-zsh"
  url "https://github.com/AmJaradat01/awesome-lazy-zsh/archive/refs/tags/v3.0.4.tar.gz"
  sha256 "5f54597a377d60ab03a24225b00f0130ff49651feed24a80e39577470dcfd99c"
  license "MIT"

  depends_on "git"
  depends_on "node"

  def install
    # Install supporting files
    libexec.install Dir["*"]

    # Create wrapper script that runs from the installed location
    (bin/"awesome-lazy-zsh").write <<~EOS
      #!/bin/bash
      cd "#{libexec}" && exec ./setup.sh "$@"
    EOS
  end

  test do
    # Test that the script exists and is executable
    assert_path_exists bin/"awesome-lazy-zsh"
    assert_predicate bin/"awesome-lazy-zsh", :executable?
  end
end